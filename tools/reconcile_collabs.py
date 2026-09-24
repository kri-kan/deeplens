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
    Dumps UI hierarchy with fallback and conflict recovery.
    Uses --compressed to bypass idle-state lockups caused by looping videos/animations.
    """
    dump_remote = "/data/local/tmp/uidump.xml"

    for attempt in range(1, retries + 1):
        cleanup_conflicting_services(device)

        # First attempt: dump with --compressed to file
        cmd = f"adb -s {device} shell uiautomator dump --compressed {dump_remote}"
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=12)
        out = (res.stdout or "") + (res.stderr or "")

        if "ERROR: could not get idle state" in out or "IllegalStateException" in out or "Killed" in out or res.returncode != 0:
            cleanup_conflicting_services(device)
            # Try a quick tap in center to pause any video playback
            subprocess.run(f"adb -s {device} shell input tap 540 1000", shell=True, capture_output=True)
            time.sleep(1.5)
            # Retry dump without --compressed or with
            cmd = f"adb -s {device} shell uiautomator dump --compressed {dump_remote}"
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=12)

        # Read back the dumped XML
        cat_res = subprocess.run(f"adb -s {device} shell cat {dump_remote}", shell=True, capture_output=True, text=True)
        content = (cat_res.stdout or "").strip()
        if content.startswith("<?xml") or content.startswith("<hierarchy"):
            return content

        time.sleep(1.5)

    # Last resort fallback: exec-out /dev/tty
    cleanup_conflicting_services(device)
    res = subprocess.run(f"adb -s {device} exec-out uiautomator dump /dev/tty", shell=True, capture_output=True, text=True, timeout=8)
    tty_out = (res.stdout or "").strip()
    if tty_out.startswith("<?xml") or tty_out.startswith("<hierarchy"):
        return tty_out

    return ""


def parse_bounds(bounds_str):
    match = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds_str or "")
    if not match:
        return None
    x1, y1, x2, y2 = map(int, match.groups())
    cx = (x1 + x2) // 2
    cy = (y1 + y2) // 2
    return {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "cx": cx, "cy": cy}


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

    # Long press profile tab (bottom right) to open account switcher
    run_cmd(f"adb -s {device} shell input swipe 972 2334 972 2334 1500", check=False)
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


def open_post_tagging(device, creator, shortcode):
    """
    Opens post in edit mode and navigates to the 'Tag people' screen.
    Always uses /p/{shortcode}/ to ensure Instagram opens the exact post rather than
    redirecting to the public algorithmic Reels recommendation feed.
    """
    print(f"[*] Opening post {shortcode} in edit mode...", file=sys.stderr)
    post_url = f"https://www.instagram.com/p/{shortcode}/"
    run_cmd(f"adb -s {device} shell am start -a android.intent.action.VIEW -d '{post_url}' -p com.instagram.android")
    time.sleep(3.5)

    xml_str = get_ui_dump(device)
    if not xml_str:
        time.sleep(2.0)
        xml_str = get_ui_dump(device)

    # Verify that the screen is displaying the creator's post and not an external reel/feed
    if creator.lower() not in xml_str.lower():
        print(f"[!] Security check failed: Creator @{creator} not found on screen for post {shortcode}!", file=sys.stderr)
        raise RuntimeError(f"Target post screen does not match creator @{creator}")

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
        return _open_reel_tagging(device, creator, shortcode, xml_str)
    else:
        print(f"[*] Detected Standard Instagram Post interface for {shortcode}", file=sys.stderr)
        return _open_feed_post_tagging(device, creator, shortcode, xml_str)


def _open_reel_tagging(device, creator, shortcode, xml_str):
    # Step 1: Pause reel video to allow UI to settle
    try:
        root = ET.fromstring(xml_str)
        for node in root.iter("node"):
            res_id = node.attrib.get("resource-id") or ""
            if "clips_pause_button" in res_id:
                b = parse_bounds(node.attrib.get("bounds"))
                if b:
                    tap(device, b["cx"], b["cy"], delay=1.0)
                    break
    except Exception:
        pass

    # Step 2: Tap the 3-dots "More" button on Reel
    more_bounds = None
    try:
        root = ET.fromstring(xml_str)
        for node in root.iter("node"):
            res_id = node.attrib.get("resource-id") or ""
            desc = node.attrib.get("content-desc") or ""
            if "clips_ufi_more_button" in res_id or desc in ["More", "More options"]:
                more_bounds = parse_bounds(node.attrib.get("bounds"))
                break
    except Exception:
        pass

    if not more_bounds:
        more_bounds = {"cx": 1001, "cy": 1794}

    print(f"[*] Tapping Reel More button at ({more_bounds['cx']}, {more_bounds['cy']})...", file=sys.stderr)
    tap(device, more_bounds["cx"], more_bounds["cy"], delay=2.5)

    # Step 3: Find and tap "Manage" in the bottom sheet
    menu_xml = get_ui_dump(device)
    manage_bounds = None
    try:
        root = ET.fromstring(menu_xml)
        for node in root.iter("node"):
            text = (node.attrib.get("text") or "").strip()
            if text == "Manage":
                manage_bounds = parse_bounds(node.attrib.get("bounds"))
                break
    except Exception:
        pass

    if not manage_bounds:
        manage_bounds = {"cx": 280, "cy": 1634}

    print(f"[*] Tapping 'Manage' at ({manage_bounds['cx']}, {manage_bounds['cy']})...", file=sys.stderr)
    tap(device, manage_bounds["cx"], manage_bounds["cy"], delay=2.5)

    # Step 4: Find and tap "Edit" in "Manage your reel" sheet
    manage_xml = get_ui_dump(device)
    edit_bounds = None
    try:
        root = ET.fromstring(manage_xml)
        for node in root.iter("node"):
            text = (node.attrib.get("text") or "").strip()
            if text == "Edit":
                edit_bounds = parse_bounds(node.attrib.get("bounds"))
                break
    except Exception:
        pass

    if not edit_bounds:
        edit_bounds = {"cx": 240, "cy": 866}

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

    # Step 6: Find and tap "Tag people" in "Edit info" screen
    tag_bounds = None
    try:
        root = ET.fromstring(edit_xml)
        for node in root.iter("node"):
            text = (node.attrib.get("text") or "").strip()
            res_id = node.attrib.get("resource-id") or ""
            if text == "Tag people" or "tag_people" in res_id:
                tag_bounds = parse_bounds(node.attrib.get("bounds"))
                break
    except Exception:
        pass

    if not tag_bounds:
        tag_bounds = {"cx": 498, "cy": 1393}

    print(f"[*] Tapping 'Tag people' at ({tag_bounds['cx']}, {tag_bounds['cy']})...", file=sys.stderr)
    tap(device, tag_bounds["cx"], tag_bounds["cy"], delay=2.5)
    print(f"[✓] Landed on Reel 'Tag people' screen", file=sys.stderr)
    return {"is_reel": True, "boosted": False}


def _open_feed_post_tagging(device, creator, shortcode, xml_str):
    # Tap 3-dots media options button
    dots_bounds = None
    try:
        root = ET.fromstring(xml_str)
        for node in root.iter("node"):
            desc = node.attrib.get("content-desc") or ""
            res_id = node.attrib.get("resource-id") or ""
            if "media_option_button" in res_id or "More actions for this post" in desc:
                dots_bounds = parse_bounds(node.attrib.get("bounds"))
                break
    except Exception:
        pass

    if not dots_bounds:
        dots_bounds = {"cx": 1022, "cy": 336}

    tap(device, dots_bounds["cx"], dots_bounds["cy"], delay=2.0)

    # Tap "Edit"
    xml_str = get_ui_dump(device)
    edit_bounds = None
    try:
        root = ET.fromstring(xml_str)
        for node in root.iter("node"):
            text = (node.attrib.get("text") or "").strip()
            if text == "Edit":
                edit_bounds = parse_bounds(node.attrib.get("bounds"))
                break
    except Exception:
        pass

    if not edit_bounds:
        edit_bounds = {"cx": 230, "cy": 1460}

    tap(device, edit_bounds["cx"], edit_bounds["cy"], delay=2.5)

    # Check boosted post alert
    xml_str = get_ui_dump(device)
    if is_boosted_ad_alert(xml_str):
        print("[!] Detected 'Unable to edit post' alert (post has a related ad/boost).", file=sys.stderr)
        dismiss_boosted_ad_alert(device, xml_str)
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

    # Tap "Tag people and collaborators"
    tag_bounds = None
    try:
        root = ET.fromstring(xml_str)
        for node in root.iter("node"):
            text = (node.attrib.get("text") or "").strip()
            res_id = node.attrib.get("resource-id") or ""
            if "Tag people and collaborators" in text or "m2_people_tagging" in res_id or text == "Tag people":
                tag_bounds = parse_bounds(node.attrib.get("bounds"))
                break
    except Exception:
        pass

    if not tag_bounds:
        tag_bounds = {"cx": 300, "cy": 1675}

    tap(device, tag_bounds["cx"], tag_bounds["cy"], delay=2.5)
    print(f"[✓] Landed on Feed Post 'Tag people and collaborators' screen", file=sys.stderr)
    return {"is_reel": False, "boosted": False}


def inspect_and_reconcile_tagging_screen(device, target_accounts, is_reel=False, dry_run=False):
    normalized_targets = [t.lower().lstrip("@").strip() for t in target_accounts if t.strip()]
    removed_accounts = []
    already_active = []
    newly_invited = []

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

    print(f"[*] Found {len(collaborator_rows)} accounts currently tagged/collaborating: {[r['username'] for r in collaborator_rows]}", file=sys.stderr)

    # Step B: Remove unwanted accounts
    for row in collaborator_rows:
        u = row["username"]
        if u not in normalized_targets:
            print(f"[!] Unwanted account detected: @{u}! Removing from post...", file=sys.stderr)
            if not dry_run and row.get("remove_bounds"):
                tap(device, row["remove_bounds"]["cx"], row["remove_bounds"]["cy"], delay=1.5)
            removed_accounts.append(u)
        else:
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
        inv_bounds = None
        try:
            r = ET.fromstring(xml_screen)
            for node in r.iter("node"):
                text = (node.attrib.get("text") or "").strip()
                desc = (node.attrib.get("content-desc") or "").strip()
                res_id = node.attrib.get("resource-id") or ""
                if "Invite collaborator" in text or "Invite collaborator" in desc or "invite_collaborator" in res_id:
                    inv_bounds = parse_bounds(node.attrib.get("bounds"))
                    break
        except Exception:
            pass

        if not inv_bounds:
            inv_bounds = {"cx": 540, "cy": 1436} if not is_reel else {"cx": 794, "cy": 1437}

        tap(device, inv_bounds["cx"], inv_bounds["cy"], delay=2.0)

        # Tap search bar and clear text
        xml_search_init = get_ui_dump(device)
        search_bar_bounds = None
        clear_button_bounds = None
        try:
            sr_init = ET.fromstring(xml_search_init)
            for node in sr_init.iter("node"):
                res_id = node.attrib.get("resource-id") or ""
                if "search_edit_text" in res_id:
                    search_bar_bounds = parse_bounds(node.attrib.get("bounds"))
                elif "clear" in res_id or "clear_button" in res_id or "action_button" in res_id:
                    clear_button_bounds = parse_bounds(node.attrib.get("bounds"))
        except Exception:
            pass

        if clear_button_bounds:
            tap(device, clear_button_bounds["cx"], clear_button_bounds["cy"], delay=0.5)

        if not search_bar_bounds:
            search_bar_bounds = {"cx": 300, "cy": 173, "x2": 880}

        tap(device, search_bar_bounds["cx"], search_bar_bounds["cy"], delay=0.8)
        if clear_button_bounds:
            tap(device, clear_button_bounds["cx"], clear_button_bounds["cy"], delay=0.5)
        # Fallback: tap right end of search bar to hit X button if present
        x_tap = min(search_bar_bounds.get("x2", 880) + 40, 930)
        tap(device, x_tap, search_bar_bounds["cy"], delay=0.5)
        # Select all and delete or backspace to guarantee clean input
        run_cmd(f"adb -s {device} shell input keyevent 123", check=False)
        for _ in range(35):
            run_cmd(f"adb -s {device} shell input keyevent 67", check=False)
        type_text(device, missing_user, delay=2.5)

        # Wait for search result and match EXACT username with retries
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
            if "Invite to collaborate" in xml_sheet:
                try:
                    shr = ET.fromstring(xml_sheet)
                    for node in shr.iter("node"):
                        if node.attrib.get("text") == "Invite to collaborate":
                            b = parse_bounds(node.attrib.get("bounds"))
                            if b:
                                tap(device, b["cx"], b["cy"], delay=2.0)
                                break
                except Exception:
                    pass
            newly_invited.append(missing_user)
            print(f"[✓] Successfully added invite for @{missing_user}", file=sys.stderr)
        else:
            print(f"[✗] Error: Exact search result not found for @{missing_user}!", file=sys.stderr)
            keyevent(device, 4, delay=1.0)

    # Step E: Save tagging screen changes
    if not dry_run:
        print("[*] Confirming tagging changes...", file=sys.stderr)
        if is_reel:
            # On Reels, Done button is top-right (center ~995, 194)
            tap(device, 995, 194, delay=2.5)
            print("[*] Saving Reel edit changes...", file=sys.stderr)
            tap(device, 995, 194, delay=3.5)
        else:
            # On Feed Posts, checkmark is top-right (center ~1006, 194)
            tap(device, 1006, 194, delay=2.5)
            print("[*] Saving Post edit changes...", file=sys.stderr)
            tap(device, 1006, 194, delay=3.5)

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
    if not args.dry_run:
        switch_to_creator(args.device, args.creator)
        nav_res = open_post_tagging(args.device, args.creator, args.shortcode)
        if nav_res and nav_res.get("boosted"):
            existing = nav_res.get("already_active", [])
            cant_invite = [t for t in targets if t.lower() not in [c.lower() for c in existing]]
            nav_res["cant_invite"] = cant_invite
            print(json.dumps(nav_res, indent=2))
            return
        if nav_res and nav_res.get("is_reel"):
            is_reel = True

    summary = inspect_and_reconcile_tagging_screen(args.device, targets, is_reel=is_reel, dry_run=args.dry_run)
    summary["boosted"] = False
    summary["cant_invite"] = []
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
