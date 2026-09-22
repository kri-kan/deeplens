#!/usr/bin/env python3
"""
Reconciliation & Cleanup Tool for Instagram Collaborations
----------------------------------------------------------
Features:
1. Navigates on-screen to the Post Edit -> "Tag people and collaborators" screen.
2. Inspects on-screen collaborators under "Collaborators" (Awaiting response / Accepted).
3. Single Source of Truth: Compares on-screen accounts against curated target accounts.
4. Active Unwanted Removal: If any account is present on screen that is NOT in the curated
   targets list (e.g. @the_undefined_hourglass), it finds its remove_tag_button and taps it.
5. Graceful Skipping: If a target account is already present, it marks it as already active
   and does not attempt re-inviting.
6. Exact-Match Invites: For any intended target accounts missing from screen, taps
   "Invite collaborators", types exact handle, taps exact text result, and confirms bottom sheet.
7. Saves the post edit cleanly.
8. Returns structured JSON reporting: removed, already_active, newly_invited.
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


def get_ui_dump(device, retries=5):
    for i in range(retries):
        cmd = f"adb -s {device} exec-out uiautomator dump /dev/tty"
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        out = res.stdout
        if "UI hierchary dumped to:" in out:
            out = out.split("UI hierchary dumped to:")[0]
        elif "UI hierarchy dumped to:" in out:
            out = out.split("UI hierarchy dumped to:")[0]
        out = out.strip()
        if out.startswith("<?xml") or out.startswith("<hierarchy"):
            return out
        time.sleep(1.5)
    # retry once with temporary file
    run_cmd(f"adb -s {device} shell uiautomator dump /data/local/tmp/uidump.xml", check=False)
    res2 = run_cmd(f"adb -s {device} shell cat /data/local/tmp/uidump.xml", check=False)
    out = res2.stdout.strip()
    return out


def parse_bounds(bounds_str):
    # format: [x1,y1][x2,y2]
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
    # Check if already active or switch via long press on profile
    run_cmd(f"adb -s {device} shell am start -a android.intent.action.VIEW -d 'https://www.instagram.com/' -p com.instagram.android", check=False)
    time.sleep(2)
    # Long press profile tab
    run_cmd(f"adb -s {device} shell input swipe 972 2334 972 2334 1500", check=False)
    time.sleep(2)
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
    # If not found or bottom sheet wasn't open, press back to dismiss
    keyevent(device, 4, delay=1.0)


def open_post_tagging(device, creator, shortcode):
    print(f"[*] Opening post {shortcode} in edit mode...", file=sys.stderr)
    post_url = f"https://www.instagram.com/p/{shortcode}/"
    run_cmd(f"adb -s {device} shell am start -a android.intent.action.VIEW -d '{post_url}' -p com.instagram.android")
    time.sleep(3.5)

    # Tap 3-dots media options button
    xml_str = get_ui_dump(device)
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
        # Fallback coordinates for 3-dots top right
        dots_bounds = {"cx": 1022, "cy": 336}

    tap(device, dots_bounds["cx"], dots_bounds["cy"], delay=2.0)

    # Tap "Edit"
    xml_str = get_ui_dump(device)
    edit_bounds = None
    try:
        root = ET.fromstring(xml_str)
        for node in root.iter("node"):
            text = node.attrib.get("text") or ""
            if text == "Edit":
                edit_bounds = parse_bounds(node.attrib.get("bounds"))
                break
    except Exception:
        pass

    if not edit_bounds:
        # Fallback coordinates for Edit row
        edit_bounds = {"cx": 230, "cy": 1460}

    tap(device, edit_bounds["cx"], edit_bounds["cy"], delay=2.5)

    # Check if Instagram blocked edit due to boosted post / active ad
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
            "newly_invited": []
        }

    # Tap "Tag people and collaborators"
    tag_bounds = None
    try:
        root = ET.fromstring(xml_str)
        for node in root.iter("node"):
            text = node.attrib.get("text") or ""
            res_id = node.attrib.get("resource-id") or ""
            if "Tag people and collaborators" in text or "m2_people_tagging" in res_id or text == "Tag people":
                tag_bounds = parse_bounds(node.attrib.get("bounds"))
                break
    except Exception:
        pass

    if not tag_bounds:
        tag_bounds = {"cx": 300, "cy": 1675}

    tap(device, tag_bounds["cx"], tag_bounds["cy"], delay=2.5)
    print(f"[✓] Landed on 'Tag people and collaborators' screen", file=sys.stderr)
    return None


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
    """
    On the post view, inspect existing tagged people / collaborators.
    Attempts to tap 'View tagged people' indicator to read the full bottom sheet.
    """
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
        # Close bottom sheet
        keyevent(device, 4, delay=1.5)

    return collabs


def inspect_and_reconcile_tagging_screen(device, target_accounts, dry_run=False):
    """
    On the 'Tag people' screen:
    1. Parse all collaborator rows under 'Collaborators'.
    2. Any account not in target_accounts -> tap remove_tag_button.
    3. Any account in target_accounts -> record in already_active.
    4. Any target account missing -> tap 'Invite collaborators', search, select, confirm.
    """
    normalized_targets = [t.lower().lstrip("@").strip() for t in target_accounts if t.strip()]
    removed_accounts = []
    already_active = []
    newly_invited = []

    time.sleep(1.5)
    xml_str = get_ui_dump(device)
    if not xml_str:
        raise RuntimeError("Failed to dump UI on Tag people screen")

    root = ET.fromstring(xml_str)

    # Step A: Identify existing collaborator rows
    # Each row is a container (row_user_container_base) containing row_user_primary_name and remove_tag_button
    collaborator_rows = []
    for node in root.iter("node"):
        res_id = node.attrib.get("resource-id") or ""
        if "row_user_container_base" in res_id or node.attrib.get("class") == "android.widget.LinearLayout":
            # Check if this container has primary name and remove button
            name_node = None
            remove_node = None
            for child in node.iter("node"):
                c_res = child.attrib.get("resource-id") or ""
                if "row_user_primary_name" in c_res:
                    name_node = child
                elif "remove_tag_button" in c_res:
                    remove_node = child
            if name_node is not None and remove_node is not None:
                username = (name_node.attrib.get("text") or "").strip().lower()
                rem_bounds = parse_bounds(remove_node.attrib.get("bounds"))
                if username and rem_bounds:
                    collaborator_rows.append({
                        "username": username,
                        "remove_bounds": rem_bounds
                    })

    print(f"[*] Found {len(collaborator_rows)} accounts currently tagged/collaborating: {[r['username'] for r in collaborator_rows]}", file=sys.stderr)

    # Step B: Remove unwanted accounts
    for row in collaborator_rows:
        u = row["username"]
        if u not in normalized_targets:
            print(f"[!] Unwanted account detected: @{u}! Removing from post...", file=sys.stderr)
            if not dry_run:
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

        # Dynamically find the "Invite collaborators" button at its CURRENT on-screen position
        time.sleep(1.0)
        xml_screen = get_ui_dump(device)
        inv_bounds = None
        try:
            r = ET.fromstring(xml_screen)
            for node in r.iter("node"):
                text = node.attrib.get("text") or ""
                res_id = node.attrib.get("resource-id") or ""
                if "Invite collaborators" in text or "invite_collaborator" in res_id:
                    inv_bounds = parse_bounds(node.attrib.get("bounds"))
                    break
        except Exception:
            pass

        if not inv_bounds:
            inv_bounds = {"cx": 540, "cy": 1436}

        tap(device, inv_bounds["cx"], inv_bounds["cy"], delay=2.0)

        # Tap search bar and clear any existing text
        xml_search_init = get_ui_dump(device)
        search_bar_bounds = None
        clear_button_bounds = None
        try:
            sr_init = ET.fromstring(xml_search_init)
            for node in sr_init.iter("node"):
                res_id = node.attrib.get("resource-id") or ""
                if "search_edit_text" in res_id:
                    search_bar_bounds = parse_bounds(node.attrib.get("bounds"))
                elif "clear" in res_id or "clear_button" in res_id:
                    clear_button_bounds = parse_bounds(node.attrib.get("bounds"))
        except Exception:
            pass

        if clear_button_bounds:
            tap(device, clear_button_bounds["cx"], clear_button_bounds["cy"], delay=0.5)

        if not search_bar_bounds:
            search_bar_bounds = {"cx": 300, "cy": 173}

        tap(device, search_bar_bounds["cx"], search_bar_bounds["cy"], delay=1.0)
        # Clear field by tapping clear button if present or sending backspaces
        if clear_button_bounds:
            tap(device, clear_button_bounds["cx"], clear_button_bounds["cy"], delay=0.5)
        for _ in range(30):
            run_cmd(f"adb -s {device} shell input keyevent 67", check=False)
        type_text(device, missing_user, delay=2.5)

        # Wait for search result and match EXACT username
        xml_search = get_ui_dump(device)
        result_bounds = None
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
            # Fallback: search any node with exact text
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
            # Press back to exit search bar
            keyevent(device, 4, delay=1.0)

    # Step E: Save tagging screen changes
    if not dry_run:
        print("[*] Tapping checkmark to confirm tagging changes...", file=sys.stderr)
        # Top-right checkmark button on Tag people screen (action_bar_button_action)
        tap(device, 1006, 194, delay=2.5)

        print("[*] Tapping checkmark to save post edit changes...", file=sys.stderr)
        # Top-right checkmark button on Edit info screen (action_bar_button_action)
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

    if not args.dry_run:
        switch_to_creator(args.device, args.creator)
        boosted_res = open_post_tagging(args.device, args.creator, args.shortcode)
        if boosted_res and boosted_res.get("boosted"):
            existing = boosted_res.get("already_active", [])
            cant_invite = [t for t in targets if t.lower() not in [c.lower() for c in existing]]
            boosted_res["cant_invite"] = cant_invite
            print(json.dumps(boosted_res, indent=2))
            return

    summary = inspect_and_reconcile_tagging_screen(args.device, targets, dry_run=args.dry_run)
    summary["boosted"] = False
    summary["cant_invite"] = []
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
