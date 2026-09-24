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
    If Maestro or dev.mobile.maestro is running, uiautomator dump gets killed (SIGKILL 137).
    """
    try:
        subprocess.run(
            f"adb -s {device} shell am force-stop dev.mobile.maestro",
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
    """
    dump_remote = "/data/local/tmp/uidump.xml"

    for attempt in range(1, retries + 1):
        cleanup_conflicting_services(device)
        subprocess.run(f"adb -s {device} shell rm -f {dump_remote}", shell=True, capture_output=True)

        # First attempt: dump with --compressed to file
        cmd = f"adb -s {device} shell uiautomator dump --compressed {dump_remote}"
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=12)

        # Read back the dumped XML
        cat_res = subprocess.run(f"adb -s {device} shell cat {dump_remote}", shell=True, capture_output=True, text=True)
        content = (cat_res.stdout or "").strip()
        if content.startswith("<?xml") or content.startswith("<hierarchy"):
            return content

        # Last resort fallback: exec-out /dev/tty
        tty_res = subprocess.run(f"adb -s {device} exec-out uiautomator dump /dev/tty", shell=True, capture_output=True, text=True, timeout=8)
        tty_out = (tty_res.stdout or "").strip()
        if "<?xml" in tty_out or "<hierarchy" in tty_out:
            clean = tty_out.split("<?xml")[-1]
            if not clean.startswith("<?xml"):
                clean = "<?xml" + clean
            clean = clean.split("UI hierchary")[0].split("UI hierarchy")[0].strip()
            return clean

        time.sleep(1.0)

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
                            tap(device, b["cx"], b["cy"], delay=3.0)
                            print(f"[✓] Switched to creator account @{creator}", file=sys.stderr)
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
        res = _open_feed_post_tagging(device, creator, shortcode, xml_str)

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

    # Step 3: Find and tap "Manage" in the bottom sheet purely by text/desc
    menu_xml = get_ui_dump(device)
    menu_root = ET.fromstring(menu_xml)
    manage_bounds = find_node(menu_root, text="Manage") or find_node(menu_root, desc="Manage")
    if not manage_bounds:
        raise RuntimeError("Reel navigation failed: 'Manage' button not found in UI hierarchy")

    print(f"[*] Tapping 'Manage' at ({manage_bounds['cx']}, {manage_bounds['cy']})...", file=sys.stderr)
    tap(device, manage_bounds["cx"], manage_bounds["cy"], delay=2.5)

    # Step 4: Find and tap "Edit" in "Manage your reel" sheet purely by text/desc
    manage_xml = get_ui_dump(device)
    manage_root = ET.fromstring(manage_xml)
    edit_bounds = find_node(manage_root, text="Edit") or find_node(manage_root, desc="Edit")
    if not edit_bounds:
        raise RuntimeError("Reel navigation failed: 'Edit' button not found in UI hierarchy")

    print(f"[*] Tapping 'Edit' at ({edit_bounds['cx']}, {edit_bounds['cy']})...", file=sys.stderr)
    tap(device, edit_bounds["cx"], edit_bounds["cy"], delay=3.0)

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


def _open_feed_post_tagging(device, creator, shortcode, xml_str):
    root = ET.fromstring(xml_str)
    # Tap 3-dots media options button purely by resource-id / desc
    dots_bounds = find_node(root, res_id_contains="media_option_button") or find_node(root, desc_contains="More actions")
    if not dots_bounds:
        raise RuntimeError("Feed Post navigation failed: 'More actions' (3-dots) button not found in UI hierarchy")

    print(f"[*] Tapping Post More button at ({dots_bounds['cx']}, {dots_bounds['cy']})...", file=sys.stderr)
    tap(device, dots_bounds["cx"], dots_bounds["cy"], delay=2.0)

    # Tap "Edit" purely by text/desc
    menu_xml = get_ui_dump(device)
    menu_root = ET.fromstring(menu_xml)
    edit_bounds = find_node(menu_root, text="Edit") or find_node(menu_root, desc="Edit")
    if not edit_bounds:
        raise RuntimeError("Feed Post navigation failed: 'Edit' button not found in UI hierarchy")

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

    # Tap "Tag people and collaborators" purely by element text / res_id
    edit_root = ET.fromstring(edit_xml)
    tag_bounds = find_node(edit_root, text_contains="Tag people") or find_node(edit_root, desc_contains="Tag people") or find_node(edit_root, res_id_contains="people_tagging")
    if not tag_bounds:
        raise RuntimeError("Feed Post navigation failed: 'Tag people' row not found in UI hierarchy")

    print(f"[*] Tapping 'Tag people' at ({tag_bounds['cx']}, {tag_bounds['cy']})...", file=sys.stderr)
    tap(device, tag_bounds["cx"], tag_bounds["cy"], delay=2.5)
    print(f"[✓] Landed on Feed Post 'Tag people and collaborators' screen", file=sys.stderr)
    return {"is_reel": False, "boosted": False}


def inspect_and_reconcile_tagging_screen(device, target_accounts, header_collabs=None, is_reel=False, dry_run=False):
    normalized_targets = [t.lower().lstrip("@").strip() for t in target_accounts if t.strip()]
    removed_accounts = []
    already_active = []
    newly_invited = []

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
        inv_bounds = (
            find_node(r, res_id_contains="invite_collaborator")
            or find_node(r, desc_contains="Invite collaborator")
            or find_node(r, text_contains="Invite collaborator")
        )
        if not inv_bounds:
            raise RuntimeError("Tagging screen failed: 'Invite collaborators' button not found in UI hierarchy")

        tap(device, inv_bounds["cx"], inv_bounds["cy"], delay=2.0)

        # Tap search bar and clear text purely by element resolution
        xml_search_init = get_ui_dump(device)
        sr_init = ET.fromstring(xml_search_init)
        search_bar_bounds = find_node(sr_init, res_id_contains="search_edit_text")
        if not search_bar_bounds:
            raise RuntimeError("Search screen failed: 'search_edit_text' input not found in UI hierarchy")

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
                for node in sr.iter("node"):
                    res_id = node.attrib.get("resource-id") or ""
                    text = (node.attrib.get("text") or "").strip().lower()
                    if "row_search_user_username" in res_id and text == missing_user:
                        result_bounds = parse_bounds(node.attrib.get("bounds"))
                        break
            except Exception:
                pass

            if not result_bounds:
                try:
                    sr = ET.fromstring(xml_search)
                    for node in sr.iter("node"):
                        text = (node.attrib.get("text") or "").strip().lower()
                        if text == missing_user and "search_edit_text" not in (node.attrib.get("resource-id") or ""):
                            result_bounds = parse_bounds(node.attrib.get("bounds"))
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

            newly_invited.append(missing_user)
            print(f"[✓] Successfully added invite for @{missing_user}", file=sys.stderr)
        else:
            print(f"[✗] Error: Exact search result not found for @{missing_user}!", file=sys.stderr)
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
        "newly_invited": newly_invited
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
    summary["cant_invite"] = []
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
