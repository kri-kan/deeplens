#!/usr/bin/env python3
"""
Reconciliation & Cleanup Tool for Instagram Collaborations
----------------------------------------------------------
Features:
1. Automatically clears conflicting UiTestAutomationService / dev.mobile.maestro sessions.
2. Uses compressed uiautomator dumps to avoid idle-state timeouts on active animations/video.
3. Automatically detects whether the post is an Instagram Reel (/reel/) or Standard Feed Post (/p/).
4. Navigates Reels-specific menu hierarchy: More (...) -> Manage -> Edit -> Tag people.
5. Inspects on-screen collaborators under "Collaborators" (Awaiting response / Accepted).
6. Single Source of Truth: Compares on-screen accounts against curated target accounts.
7. Active Unwanted Removal: Removes external/unwanted collaborator tags.
8. Exact-Match Invites: For missing target accounts, searches, selects exact match, and confirms invite.
9. Saves edits cleanly using appropriate Done/Checkmark buttons for Reels vs Feed posts.
10. Returns structured JSON: {"removed": [...], "already_active": [...], "newly_invited": [...], "boosted": bool, "cant_invite": [...]}.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET


def run_cmd(cmd, check=True):
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and res.returncode != 0:
        raise RuntimeError(f"Command failed (code {res.returncode}): {cmd}\nStderr: {res.stderr}")
    return res


def cleanup_conflicting_services(device):
    """
    Android only allows one UiTestAutomationService active at any time.
    If Maestro (dev.mobile.maestro / dev.mobile.maestro.test) or orphaned uiautomator
    processes are running, uiautomator dump gets killed (SIGKILL 137) or hangs.
    Also ensures animation scales are disabled so continuous window animators do not prevent idle state.
    """
    for anim in ["window_animation_scale", "transition_animation_scale", "animator_duration_scale"]:
        try:
            subprocess.run(
                f"adb -s {device} shell settings put global {anim} 0",
                shell=True,
                capture_output=True,
                text=True,
                timeout=3
            )
        except Exception:
            pass

    for pkg in ["dev.mobile.maestro", "dev.mobile.maestro.test", "com.android.chrome"]:
        try:
            subprocess.run(
                f"adb -s {device} shell am force-stop {pkg}",
                shell=True,
                capture_output=True,
                text=True,
                timeout=5
            )
        except Exception:
            pass
    for proc in ["dev.mobile.maestro", "uiautomator"]:
        try:
            subprocess.run(
                f"adb -s {device} shell pkill -f {proc}",
                shell=True,
                capture_output=True,
                text=True,
                timeout=5
            )
        except Exception:
            pass


def get_ui_dump(device, retries=4):
    """
    Dumps UI hierarchy with zero side-effects (no rogue screen taps).
    Always removes stale dump files first to guarantee fresh reads.
    Falls back cleanly to /dev/tty if file dump fails.
    Both subprocess calls are wrapped against TimeoutExpired and kill any
    stuck uiautomator daemon so subsequent retries are not blocked.
    """
    dump_remote = "/data/local/tmp/uidump.xml"

    for attempt in range(1, retries + 1):
        cleanup_conflicting_services(device)
        subprocess.run(f"adb -s {device} shell rm -f {dump_remote}", shell=True, capture_output=True)

        # Pause any active media (video/audio playback) to ensure UI reaches idle state
        subprocess.run(f"adb -s {device} shell input keyevent 127", shell=True, capture_output=True)

        # Primary: dump with --compressed to file
        try:
            cmd = f"adb -s {device} shell uiautomator dump --compressed {dump_remote}"
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=12)
            out_combined = (res.stdout or "") + (res.stderr or "")
            if res.returncode != 0 or "could not get idle state" in out_combined:
                # If idle state failed, try sending media pause again
                subprocess.run(f"adb -s {device} shell input keyevent 127", shell=True, capture_output=True)
                err_msg = out_combined.strip()
                if err_msg:
                    print(f"[!] get_ui_dump: primary dump non-zero/not-idle ({res.returncode}) on attempt {attempt}/{retries}: {err_msg}", file=sys.stderr)
        except subprocess.TimeoutExpired:
            print(f"[!] get_ui_dump: primary dump timed out (attempt {attempt}/{retries}), retrying...", file=sys.stderr)
            try:
                subprocess.run(f"adb -s {device} shell pkill -f uiautomator", shell=True, capture_output=True, timeout=3)
            except Exception:
                pass
            time.sleep(1.5)
            continue

        # Read back the dumped XML
        cat_res = subprocess.run(f"adb -s {device} shell cat {dump_remote}", shell=True, capture_output=True, text=True)
        content = (cat_res.stdout or "").strip()
        if content.startswith("<?xml") or content.startswith("<hierarchy"):
            return content

        # Last resort fallback: exec-out /dev/tty (ensure media is paused)
        subprocess.run(f"adb -s {device} shell input keyevent 127", shell=True, capture_output=True)
        try:
            tty_res = subprocess.run(f"adb -s {device} exec-out uiautomator dump /dev/tty", shell=True, capture_output=True, text=True, timeout=8)
            tty_out = (tty_res.stdout or "").strip()
            if "<?xml" in tty_out or "<hierarchy" in tty_out:
                clean = tty_out.split("<?xml")[-1]
                if not clean.startswith("<?xml"):
                    clean = "<?xml" + clean
                clean = clean.split("UI hierchary")[0].split("UI hierarchy")[0].strip()
                return clean
            else:
                err_msg = (tty_res.stderr or tty_out or "").strip()
                if err_msg and not err_msg.startswith("UI hier"):
                    print(f"[!] get_ui_dump: exec-out dump non-xml (attempt {attempt}/{retries}): {err_msg[:100]}", file=sys.stderr)
        except subprocess.TimeoutExpired:
            print(f"[!] get_ui_dump: exec-out fallback timed out (attempt {attempt}/{retries}), retrying...", file=sys.stderr)
            try:
                subprocess.run(f"adb -s {device} shell pkill -f uiautomator", shell=True, capture_output=True, timeout=3)
            except Exception:
                pass

        time.sleep(1.5)

    return ""


def parse_bounds(bounds_str):
    match = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds_str or "")
    if not match:
        return None
    x1, y1, x2, y2 = map(int, match.groups())
    cx = (x1 + x2) // 2
    cy = (y1 + y2) // 2
    return {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "cx": cx, "cy": cy}


def find_node(root, text=None, text_contains=None, desc=None, desc_contains=None, res_id=None, res_id_contains=None):
    """
    Finds element bounds purely based on element hierarchy, IDs, text, or content-desc.
    Returns parsed bounds dict {"x1", "y1", "x2", "y2", "cx", "cy"} or None.
    """
    if root is None:
        return None
    for node in root.iter("node"):
        n_text = (node.attrib.get("text") or "").strip()
        n_desc = (node.attrib.get("content-desc") or "").strip()
        n_res = (node.attrib.get("resource-id") or "").strip()

        if text is not None and n_text != text:
            continue
        if text_contains is not None and text_contains.lower() not in n_text.lower():
            continue
        if desc is not None and n_desc != desc:
            continue
        if desc_contains is not None and desc_contains.lower() not in n_desc.lower():
            continue
        if res_id is not None and n_res != res_id:
            continue
        if res_id_contains is not None and res_id_contains.lower() not in n_res.lower():
            continue

        b = parse_bounds(node.attrib.get("bounds"))
        if b:
            return b
    return None


def extract_header_collaborators(root, creator="vayyari_fashions"):
    """
    Inspects the initial post view for already published co-authors (e.g. 'vayyari_fashions and editionsbyvayyari')
    or status notifications (e.g. '... were invited to be collaborators but haven't accepted yet').
    """
    collabs = []
    if root is None:
        return collabs
    for node in root.iter("node"):
        text = (node.attrib.get("text") or "").strip()
        desc = (node.attrib.get("content-desc") or "").strip()
        res = (node.attrib.get("resource-id") or "").strip()

        # 1. Co-authors in profile header (e.g. 'vayyari_fashions and editionsbyvayyari')
        if "profile_name" in res or "profile_header" in res or "title" in res:
            for s in [text, desc]:
                if " and " in s:
                    for part in s.split(" and "):
                        h = part.strip().lstrip("@").lower()
                        if h and h != creator.lower() and h not in collabs:
                            collabs.append(h)

        # 2. Status text (e.g. 'everydayvayyari and dressbyvayyari were invited to be collaborators...')
        if "invited to be collaborators" in text or "invited to be collaborators" in desc:
            msg = text if "invited to be collaborators" in text else desc
            prefix = msg.split("were invited")[0]
            for part in prefix.split(" and "):
                for sub in part.split(","):
                    h = sub.strip().lstrip("@").lower()
                    if h and h != creator.lower() and h not in collabs:
                        collabs.append(h)

    return collabs


def tap(device, x, y, delay=1.0):
    run_cmd(f"adb -s {device} shell input tap {x} {y}")
    time.sleep(delay)


def type_text(device, text, delay=1.5):
    run_cmd(f"adb -s {device} shell input text '{text}'")
    time.sleep(delay)


def keyevent(device, code, delay=1.0):
    run_cmd(f"adb -s {device} shell input keyevent {code}")
    time.sleep(delay)


def switch_to_creator(device, creator):
    print(f"[*] Ensuring active Instagram session is @{creator}...", file=sys.stderr)
    cleanup_conflicting_services(device)

    # Bring Instagram to home screen
    run_cmd(f"adb -s {device} shell am start -a android.intent.action.VIEW -d 'https://www.instagram.com/' -p com.instagram.android", check=False)
    time.sleep(2.5)

    home_xml = get_ui_dump(device)
    home_root = ET.fromstring(home_xml) if home_xml else None
    prof_node = find_node(home_root, res_id_contains="profile_tab") or find_node(home_root, desc="Profile")

    if prof_node:
        # Long press profile tab element to open account switcher purely by element bounds
        run_cmd(f"adb -s {device} shell input swipe {prof_node['cx']} {prof_node['cy']} {prof_node['cx']} {prof_node['cy']} 1500", check=False)
        time.sleep(2.5)

        xml_str = get_ui_dump(device)
        if creator in xml_str:
            try:
                root = ET.fromstring(xml_str)
                for node in root.iter("node"):
                    if node.attrib.get("text") == creator:
                        b = parse_bounds(node.attrib.get("bounds"))
                        if b:
                            tap(device, b["cx"], b["cy"], delay=2.5)
                            print(f"[✓] Switched to creator account @{creator}", file=sys.stderr)
                            # Verify if account bottom sheet is still visible (happens if account was already active)
                            post_tap_xml = get_ui_dump(device)
                            if post_tap_xml and ("profile_tab" not in post_tap_xml or "avatar_image_view" in post_tap_xml or creator in post_tap_xml):
                                keyevent(device, 4, delay=1.0)
                            return
            except Exception:
                pass

    # If already on creator or bottom sheet wasn't open, press back to dismiss any overlay
    keyevent(device, 4, delay=1.0)
    print(f"[*] Creator account session check complete", file=sys.stderr)


def is_boosted_ad_alert(xml_str):
    if not xml_str:
        return False
    lower = xml_str.lower()
    return (
        "unable to edit post" in lower
        or "posts that have a related ad" in lower
        or ("related ad" in lower and "cannot be edited" in lower)
        or ("ad" in lower and "cannot edit" in lower)
    )


def dismiss_boosted_ad_alert(device, xml_str):
    print("[*] Dismissing 'Unable to edit post' alert dialog...", file=sys.stderr)
    try:
        root = ET.fromstring(xml_str)
        for node in root.iter("node"):
            text = (node.attrib.get("text") or "").strip().upper()
            res_id = node.attrib.get("resource-id") or ""
            if text in ["OK", "DISMISS", "CLOSE", "GOT IT"] or "primary_button" in res_id or "button1" in res_id:
                b = parse_bounds(node.attrib.get("bounds"))
                if b:
                    tap(device, b["cx"], b["cy"], delay=1.5)
                    return True
    except Exception:
        pass
    keyevent(device, 4, delay=1.5)
    return True


def extract_collabs_from_post_view(device):
    print("[*] Extracting existing collaborators from post view...", file=sys.stderr)
    collabs = []
    xml_str = get_ui_dump(device)
    tag_icon_bounds = None
    try:
        root = ET.fromstring(xml_str)
        for node in root.iter("node"):
            desc = node.attrib.get("content-desc") or ""
            res_id = node.attrib.get("resource-id") or ""
            if "View tagged people" in desc or "indicator_icon_view" in res_id:
                tag_icon_bounds = parse_bounds(node.attrib.get("bounds"))
                break
    except Exception:
        pass

    if tag_icon_bounds:
        tap(device, tag_icon_bounds["cx"], tag_icon_bounds["cy"], delay=2.0)
        sheet_xml = get_ui_dump(device)
        try:
            sheet_root = ET.fromstring(sheet_xml)
            for node in sheet_root.iter("node"):
                res_id = node.attrib.get("resource-id") or ""
                text = (node.attrib.get("text") or "").strip()
                if text and ("row_user_primary_name" in res_id or "row_user_name" in res_id or "username" in res_id):
                    handle = text.lstrip('@')
                    if handle and handle not in collabs:
                        collabs.append(handle)
                if not text:
                    for child in node.iter("node"):
                        c_text = (child.attrib.get("text") or "").strip()
                        c_res = child.attrib.get("resource-id") or ""
                        if c_text and ("primary_name" in c_res or "username" in c_res):
                            handle = c_text.lstrip('@')
                            if handle and handle not in collabs:
                                collabs.append(handle)
        except Exception:
            pass
        keyevent(device, 4, delay=1.5)

    return collabs


def open_post_tagging(device, creator, shortcode, targets=None):
    """
    Opens post in edit mode and navigates to the 'Tag people' screen.
    Always uses /p/{shortcode}/ to ensure Instagram opens the exact post rather than
    redirecting to the public algorithmic Reels recommendation feed.
    """
    print(f"[*] Opening post {shortcode} in edit mode...", file=sys.stderr)
    post_url = f"https://www.instagram.com/p/{shortcode}/"
    run_cmd(f"adb -s {device} shell am start -a android.intent.action.VIEW -d '{post_url}' -p com.instagram.android -f 0x14000000")

    # Dismiss any Chrome or in-app BrowserLite window that may intercept the URL
    time.sleep(2.0)
    focus_check = run_cmd(f"adb -s {device} shell dumpsys window | grep -E 'mCurrentFocus|mFocusedApp'", check=False).stdout
    if "BrowserLite" in focus_check or "chrome" in focus_check.lower():
        run_cmd(f"adb -s {device} shell am force-stop com.android.chrome", check=False)
        keyevent(device, 4, delay=1.5)

    normalized_targets = [t.lower().lstrip("@").strip() for t in targets] if targets else []
    header_collabs = []
    root = None
    xml_str = ""

    # Allow up to 3 polls (with settle delays) for post and status text to render
    for attempt in range(1, 4):
        time.sleep(2.5 if attempt == 1 else 1.5)
        xml_str = get_ui_dump(device)
        if not xml_str:
            continue
        try:
            root = ET.fromstring(xml_str)
            collabs = extract_header_collaborators(root, creator)
            for c in collabs:
                if c not in header_collabs:
                    header_collabs.append(c)
            # If all targets are found, break immediately
            if normalized_targets and all(t in [c.lower() for c in header_collabs] for t in normalized_targets):
                break
        except Exception:
            pass

    if not xml_str or root is None:
        raise RuntimeError(f"Failed to dump UI hierarchy for post {shortcode}")

    # Verify that the screen is displaying the creator's post and not an external reel/feed
    author_node = (
        find_node(root, res_id_contains="row_feed_profile_header")
        or find_node(root, res_id_contains="row_feed_photo_profile_name")
        or find_node(root, res_id_contains="clips_author")
    )
    if not author_node and creator.lower() not in xml_str.lower():
        print(f"[!] Security check failed: Creator @{creator} not found on screen for post {shortcode}!", file=sys.stderr)
        raise RuntimeError(f"Target post screen does not match creator @{creator}")

    if header_collabs:
        print(f"[*] Extracted active collaborators/co-authors from post header: {header_collabs}", file=sys.stderr)

    # If all targets are already co-authoring or invited, skip edit mode entirely
    if normalized_targets and all(t in [c.lower() for c in header_collabs] for t in normalized_targets):
        print(f"[✓] All target collaborators {targets} are already co-authoring/invited on post header! Skipping edit.", file=sys.stderr)
        return {
            "skip_edit": True,
            "already_active": [t for t in normalized_targets if t in [c.lower() for c in header_collabs]],
            "newly_invited": [],
            "removed": [],
            "boosted": False,
            "cant_invite": [],
            "header_collabs": header_collabs
        }

    # Detect if screen is rendered with Instagram Reel or Standard Post UI
    is_reel = (
        "clips_ufi" in xml_str
        or "clips_video" in xml_str
        or "clips_pause_button" in xml_str
        or "clips_viewer" in xml_str
        or "Manage your reel" in xml_str
    )

    if is_reel:
        print(f"[*] Detected Instagram Reel interface for {shortcode}", file=sys.stderr)
        res = _open_reel_tagging(device, creator, shortcode, xml_str)
    else:
        print(f"[*] Detected Standard Instagram Post interface for {shortcode}", file=sys.stderr)
        res = _open_feed_post_tagging(device, creator, shortcode, xml_str, targets=targets)

    res["header_collabs"] = header_collabs
    return res


def _open_reel_tagging(device, creator, shortcode, xml_str):
    root = ET.fromstring(xml_str)

    # Step 1: Pause reel video to allow UI to settle
    pause_b = find_node(root, res_id_contains="clips_pause_button")
    if pause_b:
        tap(device, pause_b["cx"], pause_b["cy"], delay=1.0)

    # Step 2: Tap the 3-dots "More" button on Reel purely by hierarchy
    more_bounds = find_node(root, res_id_contains="clips_ufi_more_button") or find_node(root, desc="More") or find_node(root, desc="More options")
    if not more_bounds:
        raise RuntimeError("Reel navigation failed: 'More' options button not found in UI hierarchy")

    print(f"[*] Tapping Reel More button at ({more_bounds['cx']}, {more_bounds['cy']})...", file=sys.stderr)
    tap(device, more_bounds["cx"], more_bounds["cy"], delay=2.5)

    # Step 3 & 4: Find and tap "Manage" or directly "Edit" in the bottom sheet purely by text/desc
    menu_xml = get_ui_dump(device)
    menu_root = ET.fromstring(menu_xml)
    manage_bounds = find_node(menu_root, text="Manage") or find_node(menu_root, desc="Manage")
    edit_bounds = find_node(menu_root, text="Edit") or find_node(menu_root, desc="Edit")

    if not manage_bounds and not edit_bounds:
        for scroll_attempt in range(2):
            print(f"[!] Neither 'Manage' nor 'Edit' visible in bottom sheet — scrolling down (attempt {scroll_attempt + 1}/2)...", file=sys.stderr)
            run_cmd(f"adb -s {device} shell input swipe 540 1800 540 900 300", check=False)
            time.sleep(1.5)
            menu_xml = get_ui_dump(device)
            menu_root = ET.fromstring(menu_xml)
            manage_bounds = find_node(menu_root, text="Manage") or find_node(menu_root, desc="Manage")
            edit_bounds = find_node(menu_root, text="Edit") or find_node(menu_root, desc="Edit")
            if manage_bounds or edit_bounds:
                break

    if edit_bounds and not manage_bounds:
        print(f"[*] Found 'Edit' directly on bottom sheet at ({edit_bounds['cx']}, {edit_bounds['cy']})...", file=sys.stderr)
        tap(device, edit_bounds["cx"], edit_bounds["cy"], delay=3.0)
    elif manage_bounds:
        print(f"[*] Tapping 'Manage' at ({manage_bounds['cx']}, {manage_bounds['cy']})...", file=sys.stderr)
        tap(device, manage_bounds["cx"], manage_bounds["cy"], delay=2.5)
        manage_xml = get_ui_dump(device)
        manage_root = ET.fromstring(manage_xml)
        edit_bounds = find_node(manage_root, text="Edit") or find_node(manage_root, desc="Edit")
        if not edit_bounds:
            raise RuntimeError("Reel navigation failed: 'Edit' button not found in UI hierarchy")
        print(f"[*] Tapping 'Edit' at ({edit_bounds['cx']}, {edit_bounds['cy']})...", file=sys.stderr)
        tap(device, edit_bounds["cx"], edit_bounds["cy"], delay=3.0)
    else:
        raise RuntimeError("Reel navigation failed: Neither 'Manage' nor 'Edit' button found in UI hierarchy")

    # Step 5: Check boosted ad alert
    edit_xml = get_ui_dump(device)
    if is_boosted_ad_alert(edit_xml):
        print("[!] Detected 'Unable to edit post' alert on boosted Reel.", file=sys.stderr)
        dismiss_boosted_ad_alert(device, edit_xml)
        existing_collabs = extract_collabs_from_post_view(device)
        return {
            "boosted": True,
            "reason": "boosted_ad_cannot_edit",
            "already_active": existing_collabs,
            "cant_invite": [],
            "removed": [],
            "newly_invited": [],
            "is_reel": True
        }

    # Step 6: Find and tap "Tag people" in "Edit info" screen purely by element name
    edit_root = ET.fromstring(edit_xml)
    tag_bounds = find_node(edit_root, text_contains="Tag people") or find_node(edit_root, desc_contains="Tag people") or find_node(edit_root, res_id_contains="tag_people")
    if not tag_bounds:
        raise RuntimeError("Reel navigation failed: 'Tag people' option not found in UI hierarchy")

    print(f"[*] Tapping 'Tag people' at ({tag_bounds['cx']}, {tag_bounds['cy']})...", file=sys.stderr)
    tap(device, tag_bounds["cx"], tag_bounds["cy"], delay=2.5)
    print(f"[✓] Landed on Reel 'Tag people' screen", file=sys.stderr)
    return {"is_reel": True, "boosted": False}


def _open_feed_post_tagging(device, creator, shortcode, xml_str, targets=None):
    root = ET.fromstring(xml_str)
    # Tap 3-dots media options button purely by resource-id / desc
    dots_bounds = find_node(root, res_id_contains="media_option_button") or find_node(root, desc_contains="More actions")
    if not dots_bounds:
        # Check if 'View tagged people' icon is present on screen directly
        tag_icon = find_node(root, desc_contains="View tagged people") or find_node(root, res_id_contains="indicator_icon_view")
        if tag_icon:
            print(f"[*] 'More actions' (3-dots) absent, but post view with tagged icon is visible. Extracting collabs directly...", file=sys.stderr)
            existing_collabs = extract_collabs_from_post_view(device)
            return {
                "boosted": True,
                "reason": "post_uneditable_no_edit_option",
                "already_active": existing_collabs,
                "cant_invite": [t for t in (targets or []) if t.lower() not in [c.lower() for c in existing_collabs]],
                "removed": [],
                "newly_invited": [],
                "is_reel": False
            }
        raise RuntimeError("Feed Post navigation failed: 'More actions' (3-dots) button not found in UI hierarchy")

    print(f"[*] Tapping Post More button at ({dots_bounds['cx']}, {dots_bounds['cy']})...", file=sys.stderr)
    tap(device, dots_bounds["cx"], dots_bounds["cy"], delay=2.0)

    # Tap "Edit" purely by text/desc
    menu_xml = get_ui_dump(device)
    menu_root = ET.fromstring(menu_xml)
    edit_bounds = find_node(menu_root, text="Edit") or find_node(menu_root, desc="Edit")
    if not edit_bounds:
        # On video posts/reels, options like 'About this reel', 'Meta AI' push Edit below the fold.
        for scroll_attempt in range(2):
            print(f"[!] 'Edit' option not visible in bottom sheet — scrolling down (attempt {scroll_attempt + 1}/2)...", file=sys.stderr)
            run_cmd(f"adb -s {device} shell input swipe 540 1800 540 900 300", check=False)
            time.sleep(1.5)
            menu_xml = get_ui_dump(device)
            menu_root = ET.fromstring(menu_xml)
            edit_bounds = find_node(menu_root, text="Edit") or find_node(menu_root, desc="Edit")
            if edit_bounds:
                break

    if not edit_bounds:
        # Post cannot be edited (e.g. boosted ad, copyrighted audio, or Instagram policy constraint)
        print(f"[!] Post {shortcode} cannot be edited ('Edit' option absent from menu, likely boosted or licensed audio).", file=sys.stderr)
        keyevent(device, 4, delay=1.0)
        existing_collabs = extract_collabs_from_post_view(device)
        return {
            "boosted": True,
            "reason": "post_uneditable_no_edit_option",
            "already_active": existing_collabs,
            "cant_invite": [t for t in (targets or []) if t.lower() not in [c.lower() for c in existing_collabs]],
            "removed": [],
            "newly_invited": [],
            "is_reel": False
        }

    print(f"[*] Tapping 'Edit' at ({edit_bounds['cx']}, {edit_bounds['cy']})...", file=sys.stderr)
    tap(device, edit_bounds["cx"], edit_bounds["cy"], delay=2.5)

    # Check boosted post alert
    edit_xml = get_ui_dump(device)
    if is_boosted_ad_alert(edit_xml):
        print("[!] Detected 'Unable to edit post' alert (post has a related ad/boost).", file=sys.stderr)
        dismiss_boosted_ad_alert(device, edit_xml)
        existing_collabs = extract_collabs_from_post_view(device)
        return {
            "boosted": True,
            "reason": "boosted_ad_cannot_edit",
            "already_active": existing_collabs,
            "cant_invite": [],
            "removed": [],
            "newly_invited": [],
            "is_reel": False
        }

    # Tap "Tag people and collaborators" — for posts with long captions (especially carousels),
    # this row is pushed below the visible fold and won't appear in the initial dump.
    # Scroll down and retry up to 2 times before raising.
    def _find_tag_people(xml_str):
        root = ET.fromstring(xml_str)
        return (
            find_node(root, res_id_contains="people_tagging")
            or find_node(root, text_contains="Tag people")
            or find_node(root, desc_contains="Tag people")
        )

    tag_bounds = _find_tag_people(edit_xml)
    if not tag_bounds:
        scroll_view = find_node(ET.fromstring(edit_xml), res_id_contains="edit_media_scroll_view")
        scroll_cx = scroll_view["cx"] if scroll_view else 540
        scroll_cy = scroll_view["cy"] if scroll_view else 1400
        for scroll_attempt in range(2):
            print(f"[!] 'Tag people' row not visible — scrolling edit screen down (attempt {scroll_attempt + 1}/2)...", file=sys.stderr)
            run_cmd(f"adb -s {device} shell input swipe {scroll_cx} {scroll_cy} {scroll_cx} 600 500", check=False)
            time.sleep(1.5)
            edit_xml = get_ui_dump(device)
            tag_bounds = _find_tag_people(edit_xml)
            if tag_bounds:
                break

    if not tag_bounds:
        raise RuntimeError("Feed Post navigation failed: 'Tag people' row not found in UI hierarchy")

    print(f"[*] Tapping 'Tag people' at ({tag_bounds['cx']}, {tag_bounds['cy']})...", file=sys.stderr)
    tap(device, tag_bounds["cx"], tag_bounds["cy"], delay=2.5)

    # Instagram now shows an "Edit tags" disambiguation dialog after tapping "Tag people and collaborators"
    # on the Edit screen. The dialog has: "Tag people" (primary) and "Tag products" (secondary).
    # We must tap "Tag people" inside this dialog to reach the actual tagging canvas.
    after_tap_xml = get_ui_dump(device)
    after_tap_root = ET.fromstring(after_tap_xml)
    edit_tags_dialog = (
        find_node(after_tap_root, res_id="com.instagram.android:id/igds_alert_dialog_primary_button")
        or find_node(after_tap_root, res_id_contains="alert_dialog_primary_button")
        or find_node(after_tap_root, text="Tag people")
    )
    # Only tap if the "Edit tags" dialog headline is also present (guard against false positives)
    has_edit_tags_headline = find_node(after_tap_root, text="Edit tags") is not None
    if edit_tags_dialog and has_edit_tags_headline:
        print(f"[*] Detected 'Edit tags' dialog — tapping 'Tag people' at ({edit_tags_dialog['cx']}, {edit_tags_dialog['cy']})...", file=sys.stderr)
        tap(device, edit_tags_dialog["cx"], edit_tags_dialog["cy"], delay=2.5)

    print(f"[✓] Landed on Feed Post 'Tag people and collaborators' screen", file=sys.stderr)
    return {"is_reel": False, "boosted": False}


def inspect_and_reconcile_tagging_screen(device, target_accounts, header_collabs=None, is_reel=False, dry_run=False):
    normalized_targets = [t.lower().lstrip("@").strip() for t in target_accounts if t.strip()]
    removed_accounts = []
    already_active = []
    newly_invited = []
    cant_invite = []

    if header_collabs:
        for c in header_collabs:
            if c.lower() in normalized_targets and c.lower() not in already_active:
                already_active.append(c.lower())

    time.sleep(1.5)
    xml_str = get_ui_dump(device)
    if not xml_str:
        raise RuntimeError("Failed to dump UI on Tag people screen (empty hierarchy)")

    root = ET.fromstring(xml_str)

    # Step A: Identify existing collaborator rows (supports LinearLayout, FrameLayout, and RelativeLayout)
    collaborator_rows = []
    remove_buttons = []
    for node in root.iter("node"):
        res_id = node.attrib.get("resource-id") or ""
        if "remove_tag_button" in res_id:
            b = parse_bounds(node.attrib.get("bounds"))
            if b:
                remove_buttons.append(b)

    for node in root.iter("node"):
        res_id = node.attrib.get("resource-id") or ""
        if "row_user_primary_name" in res_id:
            username = (node.attrib.get("text") or "").strip().lower()
            if username:
                b = parse_bounds(node.attrib.get("bounds"))
                matching_rem = None
                if b and remove_buttons:
                    for rem in remove_buttons:
                        if abs(rem["cy"] - b["cy"]) < 90:
                            matching_rem = rem
                            break
                collaborator_rows.append({
                    "username": username,
                    "remove_bounds": matching_rem
                })

    # Also detect existing photo tags on the media canvas
    photo_tags = []
    for node in root.iter("node"):
        desc = (node.attrib.get("content-desc") or "").strip()
        if desc.lower().startswith("tagged user"):
            tagged_user = desc[len("tagged user"):].strip().lower()
            if tagged_user and tagged_user != "who's this?" and tagged_user not in photo_tags:
                photo_tags.append(tagged_user)

    for pt in photo_tags:
        if pt in normalized_targets and pt not in already_active:
            print(f"[*] Account @{pt} is already tagged on photo canvas", file=sys.stderr)
            already_active.append(pt)

    print(f"[*] Found {len(collaborator_rows)} accounts currently tagged/collaborating on screen: {[r['username'] for r in collaborator_rows]}", file=sys.stderr)

    # Step B: Remove unwanted accounts
    for row in collaborator_rows:
        u = row["username"]
        if u not in normalized_targets:
            print(f"[!] Unwanted account detected: @{u}! Removing from post...", file=sys.stderr)
            if not dry_run and row.get("remove_bounds"):
                tap(device, row["remove_bounds"]["cx"], row["remove_bounds"]["cy"], delay=1.5)
            removed_accounts.append(u)
        else:
            if u not in already_active:
                already_active.append(u)

    # Step C: Determine missing accounts
    missing_accounts = [t for t in normalized_targets if t not in already_active]
    print(f"[*] Accounts already attached: {already_active}", file=sys.stderr)
    print(f"[*] Missing accounts to invite: {missing_accounts}", file=sys.stderr)

    # Step D: Invite missing accounts
    for missing_user in missing_accounts:
        print(f"[*] Inviting missing collaborator @{missing_user}...", file=sys.stderr)
        if dry_run:
            newly_invited.append(missing_user)
            continue

        time.sleep(1.0)
        xml_screen = get_ui_dump(device)
        r = ET.fromstring(xml_screen)

        def _find_invite_button(root):
            """Try all known resource-id / text / desc variants for the invite collaborator button."""
            return (
                find_node(root, res_id_contains="invite_collaborator")
                or find_node(root, desc_contains="Invite collaborator")
                or find_node(root, text_contains="Invite collaborator")
                or find_node(root, text_contains="Add collaborator")
                or find_node(root, desc_contains="Add collaborator")
                or find_node(root, res_id_contains="collab")
            )

        inv_bounds = _find_invite_button(r)

        if not inv_bounds:
            # Check if still stuck in search view from a previous iteration
            if "search_edit_text" in xml_screen:
                print(f"[!] Still in search view from previous attempt — dismissing search...", file=sys.stderr)
                keyevent(device, 4, delay=1.0)
                xml_screen = get_ui_dump(device)
                if xml_screen and "search_edit_text" in xml_screen:
                    keyevent(device, 4, delay=1.0)
                    xml_screen = get_ui_dump(device)
                if xml_screen:
                    r = ET.fromstring(xml_screen)
                    inv_bounds = _find_invite_button(r)

        if not inv_bounds:
            # The button may be below the visible fold — scroll down and retry
            print("[!] 'Invite collaborator' button not in current view — scrolling down and retrying...", file=sys.stderr)
            run_cmd(f"adb -s {device} shell input swipe 540 1400 540 900 400", check=False)
            time.sleep(1.5)
            xml_screen = get_ui_dump(device)
            if xml_screen:
                r = ET.fromstring(xml_screen)
                inv_bounds = _find_invite_button(r)

        if not inv_bounds:
            # Save XML dump for post-mortem diagnostics before raising
            debug_path = f"/tmp/ui_dump_invite_fail_{missing_user}.xml"
            try:
                with open(debug_path, "w") as _f:
                    _f.write(xml_screen or "(empty dump)")
                print(f"[!] UI dump saved to {debug_path} for debugging", file=sys.stderr)
            except Exception:
                pass
            raise RuntimeError(
                f"Tagging screen failed: 'Invite collaborators' button not found for @{missing_user}. "
                f"Debug dump: {debug_path}"
            )

        tap(device, inv_bounds["cx"], inv_bounds["cy"], delay=2.0)

        # Tap search bar and clear text purely by element resolution
        search_bar_bounds = None
        sr_init = None
        for s_attempt in range(2):
            xml_search_init = get_ui_dump(device)
            if xml_search_init:
                sr_init = ET.fromstring(xml_search_init)
                search_bar_bounds = (
                    find_node(sr_init, res_id_contains="search_edit_text")
                    or find_node(sr_init, desc_contains="Search for a user")
                    or find_node(sr_init, text_contains="Search")
                )
                if search_bar_bounds:
                    break
            if s_attempt == 0:
                print("[!] Search screen not ready, re-tapping invite button...", file=sys.stderr)
                tap(device, inv_bounds["cx"], inv_bounds["cy"], delay=2.0)

        if not search_bar_bounds:
            print(f"[!] Warning: Could not open search for @{missing_user}, possibly max collaborators reached.", file=sys.stderr)
            cant_invite.append(missing_user)
            continue

        clear_button_bounds = find_node(sr_init, res_id_contains="action_button") or find_node(sr_init, res_id_contains="clear")
        if clear_button_bounds:
            tap(device, clear_button_bounds["cx"], clear_button_bounds["cy"], delay=0.5)

        tap(device, search_bar_bounds["cx"], search_bar_bounds["cy"], delay=0.8)

        # Re-check clear button when focused
        xml_search_focused = get_ui_dump(device)
        sr_focused = ET.fromstring(xml_search_focused)
        clear_button_bounds = find_node(sr_focused, res_id_contains="action_button") or find_node(sr_focused, res_id_contains="clear")
        if clear_button_bounds:
            tap(device, clear_button_bounds["cx"], clear_button_bounds["cy"], delay=0.5)

        # Guarantee empty text
        run_cmd(f"adb -s {device} shell input keyevent 123", check=False)
        for _ in range(35):
            run_cmd(f"adb -s {device} shell input keyevent 67", check=False)
        type_text(device, missing_user, delay=2.5)

        # Wait for search result and match EXACT username purely by element name/text
        result_bounds = None
        for attempt in range(4):
            if attempt > 0:
                time.sleep(1.2)
            xml_search = get_ui_dump(device)
            try:
                sr = ET.fromstring(xml_search)
                # First: if "No results found" is explicitly displayed, do not match background nodes!
                no_results = find_node(sr, res_id_contains="row_no_results_textview") or find_node(sr, text_contains="No results found")
                if no_results:
                    print(f"[!] Search explicitly returned 'No results found' for @{missing_user}", file=sys.stderr)
                    result_bounds = None
                    break
            except Exception:
                pass

            try:
                sr = ET.fromstring(xml_search)
                for node in sr.iter("node"):
                    res_id = node.attrib.get("resource-id") or ""
                    text = (node.attrib.get("text") or "").strip().lower()
                    content_desc = (node.attrib.get("content-desc") or "").strip().lower()
                    if "tagged user" in content_desc:
                        continue
                    if ("row_search_user_username" in res_id or "row_user_primary_name" in res_id) and text == missing_user:
                        result_bounds = parse_bounds(node.attrib.get("bounds"))
                        break
            except Exception:
                pass

            if not result_bounds:
                try:
                    sr = ET.fromstring(xml_search)
                    for node in sr.iter("node"):
                        res_id = node.attrib.get("resource-id") or ""
                        text = (node.attrib.get("text") or "").strip().lower()
                        content_desc = (node.attrib.get("content-desc") or "").strip().lower()
                        if "search_edit_text" in res_id or "tagged user" in content_desc:
                            continue
                        if text == missing_user:
                            b = parse_bounds(node.attrib.get("bounds"))
                            if b and b["cy"] > 240:
                                result_bounds = b
                                break
                except Exception:
                    pass

            if result_bounds:
                break

        if result_bounds:
            print(f"[✓] Exact match found for @{missing_user} at {result_bounds}", file=sys.stderr)
            tap(device, result_bounds["cx"], result_bounds["cy"], delay=2.0)

            # Check if "Invite to collaborate" confirmation bottom sheet appeared
            xml_sheet = get_ui_dump(device)
            shr = ET.fromstring(xml_sheet)
            confirm_b = find_node(shr, text="Invite to collaborate") or find_node(shr, desc="Invite to collaborate")
            if confirm_b:
                tap(device, confirm_b["cx"], confirm_b["cy"], delay=2.0)
                xml_sheet = get_ui_dump(device)

            # Check if search view is still open (tap didn't select an invite)
            if "search_edit_text" in xml_sheet:
                print(f"[!] Search view still active after tap on @{missing_user} — dismissing search overlay...", file=sys.stderr)
                keyevent(device, 4, delay=1.0)
                xml_sheet2 = get_ui_dump(device)
                if "search_edit_text" in xml_sheet2:
                    keyevent(device, 4, delay=1.0)
                cant_invite.append(missing_user)
            else:
                newly_invited.append(missing_user)
                print(f"[✓] Successfully added invite for @{missing_user}", file=sys.stderr)
        else:
            print(f"[✗] Error: Exact search result not found for @{missing_user}!", file=sys.stderr)
            cant_invite.append(missing_user)
            keyevent(device, 4, delay=1.0)
            xml_check = get_ui_dump(device)
            if "search_edit_text" in xml_check:
                keyevent(device, 4, delay=1.0)

    # Step E: Save tagging screen changes purely by element hierarchy
    if not dry_run:
        print("[*] Confirming tagging changes...", file=sys.stderr)
        xml_tag_done = get_ui_dump(device)
        r_tag_done = ET.fromstring(xml_tag_done)
        done_b = (
            find_node(r_tag_done, res_id_contains="clips_people_tagging_done_button")
            or find_node(r_tag_done, res_id_contains="action_bar_button_action")
            or find_node(r_tag_done, desc="Done")
            or find_node(r_tag_done, text="Done")
            or find_node(r_tag_done, desc="Save")
            or find_node(r_tag_done, text="Save")
        )
        if not done_b:
            raise RuntimeError("Tagging screen failed: 'Done/Save' button not found in UI hierarchy")
        tap(device, done_b["cx"], done_b["cy"], delay=2.5)

        print("[*] Saving Post edit changes...", file=sys.stderr)
        xml_edit_done = get_ui_dump(device)
        r_edit_done = ET.fromstring(xml_edit_done)
        save_b = (
            find_node(r_edit_done, res_id_contains="action_bar_button_action")
            or find_node(r_edit_done, res_id_contains="clips_people_tagging_done_button")
            or find_node(r_edit_done, desc="Done")
            or find_node(r_edit_done, text="Done")
            or find_node(r_edit_done, desc="Save")
            or find_node(r_edit_done, text="Save")
        )
        if not save_b:
            raise RuntimeError("Edit screen failed: 'Save/Done' button not found in UI hierarchy")
        tap(device, save_b["cx"], save_b["cy"], delay=3.5)

    return {
        "removed": removed_accounts,
        "already_active": already_active,
        "newly_invited": newly_invited,
        "cant_invite": cant_invite
    }


def main():
    parser = argparse.ArgumentParser(description="Instagram Collab Reconciliation & Removal")
    parser.add_argument("--creator", default="vayyari_fashions", help="Post creator handle")
    parser.add_argument("--shortcode", required=True, help="Post shortcode")
    parser.add_argument("--targets", required=True, help="Comma-separated target collaborator handles")
    parser.add_argument("--device", default="emulator-5554", help="ADB device ID")
    parser.add_argument("--is-reel", action="store_true", help="Explicitly mark target as Instagram Reel")
    parser.add_argument("--dry-run", action="store_true", help="Simulate without touching device")
    parser.add_argument("--simulate-boosted", action="store_true", help="Simulate boosted ad unable to edit alert for testing")

    args = parser.parse_args()
    targets = [x.strip() for x in args.targets.split(",") if x.strip()]

    if args.simulate_boosted:
        print("[*] [SIMULATION] Simulating boosted ad unable to edit alert", file=sys.stderr)
        summary = {
            "boosted": True,
            "reason": "boosted_ad_cannot_edit",
            "already_active": [],
            "cant_invite": targets,
            "removed": [],
            "newly_invited": []
        }
        print(json.dumps(summary, indent=2))
        return

    is_reel = False
    header_collabs = []
    if not args.dry_run:
        switch_to_creator(args.device, args.creator)
        nav_res = open_post_tagging(args.device, args.creator, args.shortcode, targets=targets)
        if nav_res and nav_res.get("boosted"):
            existing = nav_res.get("already_active", [])
            cant_invite = [t for t in targets if t.lower() not in [c.lower() for c in existing]]
            nav_res["cant_invite"] = cant_invite
            print(json.dumps(nav_res, indent=2))
            return

        if nav_res and nav_res.get("skip_edit"):
            print(json.dumps(nav_res, indent=2))
            return

        header_collabs = nav_res.get("header_collabs", [])
        if nav_res and nav_res.get("is_reel"):
            is_reel = True

    summary = inspect_and_reconcile_tagging_screen(args.device, targets, header_collabs=header_collabs, is_reel=is_reel, dry_run=args.dry_run)
    summary["boosted"] = False
    if "cant_invite" not in summary:
        summary["cant_invite"] = []
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
