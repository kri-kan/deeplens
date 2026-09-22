#!/usr/bin/env python3
import sys

header = """appId: com.instagram.android
---
# ==============================================================================
# Instagram Collab Automation: Multi-Account Batch Invite (Creator Flow)
#
# Parameters:
#   CREATOR_ACCOUNT: Source account handle (e.g. "vayyari_fashions")
#   COLLAB_1..5:     Target collaborator handles (up to 5 co-authors)
#   COLLAB_HANDLE:   (Legacy fallback) Single target collaborator handle
#   SHORTCODE:       (Optional) Instagram post shortcode for an existing published post.
#                    If omitted, assumes user is on the Post/Reel sharing composer screen.
# ==============================================================================

# Step 1: Verify / Switch to Creator Account if CREATOR_ACCOUNT is specified
- runFlow:
    when:
      true: ${typeof CREATOR_ACCOUNT !== 'undefined' && CREATOR_ACCOUNT !== ''}
    commands:
      - stopApp:
          appId: com.instagram.android
      - launchApp:
          appId: com.instagram.android
      - evalScript: |
          var start = new Date().getTime();
          while (new Date().getTime() < start + 3500);
      - runFlow:
          when:
            visible: "Profile"
          commands:
            - longPressOn:
                text: "Profile"
                waitToSettleTimeoutMs: 0
      - runFlow:
          when:
            notVisible: "Profile"
            visible:
              id: "com.instagram.android:id/profile_tab"
          commands:
            - longPressOn:
                id: "com.instagram.android:id/profile_tab"
                waitToSettleTimeoutMs: 0
      - evalScript: |
          var start = new Date().getTime();
          while (new Date().getTime() < start + 2000);
      - extendedWaitUntil:
          visible: "${CREATOR_ACCOUNT}"
          timeout: 8000
      - tapOn: "${CREATOR_ACCOUNT}"
      - evalScript: |
          var start = new Date().getTime();
          while (new Date().getTime() < start + 3000);

# Step 2: If SHORTCODE is provided, open the existing post and enter Edit mode
- runFlow:
    when:
      true: ${typeof SHORTCODE !== 'undefined' && SHORTCODE !== ''}
    commands:
      - openLink: "https://www.instagram.com/p/${SHORTCODE}/"
      - evalScript: |
          var start = new Date().getTime();
          while (new Date().getTime() < start + 3500);
      # Tap 3-dots options menu on the post (guarded to tap exactly once)
      - evalScript: ${output.options_opened = 'false'}
      - runFlow:
          when:
            visible: "More actions for this post"
          commands:
            - tapOn: "More actions for this post"
            - evalScript: ${output.options_opened = 'true'}
      - runFlow:
          when:
            true: ${output.options_opened == 'false'}
            visible:
              id: "com.instagram.android:id/media_option_button"
          commands:
            - tapOn:
                id: "com.instagram.android:id/media_option_button"
            - evalScript: ${output.options_opened = 'true'}
      - evalScript: |
          var start = new Date().getTime();
          while (new Date().getTime() < start + 2000);
      # Tap Edit option
      - extendedWaitUntil:
          visible: "Edit"
          timeout: 8000
      - tapOn: "Edit"
      - evalScript: |
          var start = new Date().getTime();
          while (new Date().getTime() < start + 2500);

# Step 3: Tap "Tag people and collaborators" row
- evalScript: ${output.tag_people_tapped = 'false'}
- runFlow:
    when:
      visible: "Tag people and collaborators"
    commands:
      - tapOn: "Tag people and collaborators"
      - evalScript: ${output.tag_people_tapped = 'true'}
- runFlow:
    when:
      true: ${output.tag_people_tapped == 'false'}
      visible:
        id: "com.instagram.android:id/m2_people_tagging"
    commands:
      - tapOn:
          id: "com.instagram.android:id/m2_people_tagging"
      - evalScript: ${output.tag_people_tapped = 'true'}
- runFlow:
    when:
      true: ${output.tag_people_tapped == 'false'}
      visible:
        id: "com.instagram.android:id/m2_people_tagging_primary_text"
    commands:
      - tapOn:
          id: "com.instagram.android:id/m2_people_tagging_primary_text"
      - evalScript: ${output.tag_people_tapped = 'true'}
- runFlow:
    when:
      true: ${output.tag_people_tapped == 'false'}
      visible: "Tag people"
    commands:
      - tapOn: "Tag people"
      - evalScript: ${output.tag_people_tapped = 'true'}
- runFlow:
    when:
      true: ${output.tag_people_tapped == 'false'}
      visible:
        id: "com.instagram.android:id/tag_people_row"
    commands:
      - tapOn:
          id: "com.instagram.android:id/tag_people_row"
      - evalScript: ${output.tag_people_tapped = 'true'}
- runFlow:
    when:
      true: ${output.tag_people_tapped == 'false'}
      visible:
        id: "com.instagram.android:id/primary_text"
    commands:
      - tapOn:
          id: "com.instagram.android:id/primary_text"
      - evalScript: ${output.tag_people_tapped = 'true'}

# Settle tagging screen animation
- evalScript: |
    var start = new Date().getTime();
    while (new Date().getTime() < start + 2000);
"""

def generate_collaborator_step(idx):
    if idx == 1:
        cond = "${(typeof COLLAB_1 !== 'undefined' && COLLAB_1 !== '') || (typeof COLLAB_HANDLE !== 'undefined' && COLLAB_HANDLE !== '')}"
        target_expr = "${(typeof COLLAB_1 !== 'undefined' && COLLAB_1 !== '') ? COLLAB_1 : COLLAB_HANDLE}"
        pre = """# ==============================================================================
# Step 4: Add Collaborator 1 (or single COLLAB_HANDLE)
# ==============================================================================
"""
    else:
        cond = f"${{typeof COLLAB_{idx} !== 'undefined' && COLLAB_{idx} !== ''}}"
        target_expr = f"${{COLLAB_{idx}}}"
        pre = f"""# ==============================================================================
# Step {idx + 3}: Add Collaborator {idx} (if present)
# ==============================================================================
"""

    block = pre + f"""- runFlow:
    when:
      true: {cond}
    commands:
      - evalScript: ${{output.invite_collab_tapped = 'false'}}
      - runFlow:
          when:
            visible:
              id: "com.instagram.android:id/invite_collaborator_button"
          commands:
            - tapOn:
                id: "com.instagram.android:id/invite_collaborator_button"
            - evalScript: ${{output.invite_collab_tapped = 'true'}}
      - runFlow:
          when:
            true: ${{output.invite_collab_tapped == 'false'}}
            visible: "Invite collaborators"
          commands:
            - tapOn: "Invite collaborators"
            - evalScript: ${{output.invite_collab_tapped = 'true'}}
      - runFlow:
          when:
            true: ${{output.invite_collab_tapped == 'false'}}
            visible:
              id: "com.instagram.android:id/invite_collaborator"
          commands:
            - tapOn:
                id: "com.instagram.android:id/invite_collaborator"
            - evalScript: ${{output.invite_collab_tapped = 'true'}}
      - evalScript: |
          var start = new Date().getTime();
          while (new Date().getTime() < start + 1500);
      # Type in search bar
      - extendedWaitUntil:
          visible:
            id: "com.instagram.android:id/search_edit_text"
          timeout: 6000
      - tapOn:
          id: "com.instagram.android:id/search_edit_text"
      - inputText: "{target_expr}"
      - evalScript: |
          var start = new Date().getTime();
          while (new Date().getTime() < start + 2500);
      - extendedWaitUntil:
          visible: "{target_expr}"
          timeout: 8000
      # Tap on search result (strictly requiring exact username match)
      - evalScript: ${{output.user_selected = 'false'}}
      - runFlow:
          when:
            visible:
              id: "com.instagram.android:id/row_search_user_username"
              text: "{target_expr}"
          commands:
            - tapOn:
                id: "com.instagram.android:id/row_search_user_username"
                text: "{target_expr}"
            - evalScript: ${{output.user_selected = 'true'}}
      - runFlow:
          when:
            true: ${{output.user_selected == 'false'}}
            visible: "{target_expr}"
          commands:
            - tapOn:
                text: "{target_expr}"
            - evalScript: ${{output.user_selected = 'true'}}
      - evalScript: |
          var start = new Date().getTime();
          while (new Date().getTime() < start + 1500);
      # Confirm on bottom sheet "Invite to collaborate"
      - evalScript: ${{output.collab_confirmed = 'false'}}
      - runFlow:
          when:
            visible: "Invite to collaborate"
          commands:
            - tapOn: "Invite to collaborate"
            - evalScript: ${{output.collab_confirmed = 'true'}}
      - runFlow:
          when:
            true: ${{output.collab_confirmed == 'false'}}
            visible:
              id: "com.instagram.android:id/action_sheet_row_text_view"
          commands:
            - tapOn:
                id: "com.instagram.android:id/action_sheet_row_text_view"
            - evalScript: ${{output.collab_confirmed = 'true'}}
      - evalScript: |
          var start = new Date().getTime();
          while (new Date().getTime() < start + 1500);
"""
    return block

footer = """# ==============================================================================
# Step 9: Confirm Done / Checkmark in Tag People screen (Once for all accounts)
# ==============================================================================
- evalScript: ${output.tag_done_tapped = 'false'}
- runFlow:
    when:
      visible: "Done"
    commands:
      - tapOn: "Done"
      - evalScript: ${output.tag_done_tapped = 'true'}
- runFlow:
    when:
      true: ${output.tag_done_tapped == 'false'}
      visible:
        id: "com.instagram.android:id/clips_people_tagging_done_button"
    commands:
      - tapOn:
          id: "com.instagram.android:id/clips_people_tagging_done_button"
      - evalScript: ${output.tag_done_tapped = 'true'}

# Settle back to composer / edit screen
- evalScript: |
    var start = new Date().getTime();
    while (new Date().getTime() < start + 2500);

# ==============================================================================
# Step 10: Save or Share post (Once for all accounts)
# ==============================================================================
- evalScript: ${output.save_tapped = 'false'}
- runFlow:
    when:
      visible: "Done"
    commands:
      - tapOn: "Done"
      - evalScript: ${output.save_tapped = 'true'}
- runFlow:
    when:
      true: ${output.save_tapped == 'false'}
      visible:
        id: "com.instagram.android:id/action_bar_button_action"
    commands:
      - tapOn:
          id: "com.instagram.android:id/action_bar_button_action"
      - evalScript: ${output.save_tapped = 'true'}
- runFlow:
    when:
      true: ${output.save_tapped == 'false'}
      visible: "Save"
    commands:
      - tapOn: "Save"
      - evalScript: ${output.save_tapped = 'true'}

# Final pause to allow network dispatch
- evalScript: |
    var start = new Date().getTime();
    while (new Date().getTime() < start + 3000);
"""

full_yaml = header + "\n".join([generate_collaborator_step(i) for i in range(1, 6)]) + "\n" + footer
out_path = sys.argv[1] if len(sys.argv) > 1 else "maestro/instagram_collab_invite.yaml"
with open(out_path, "w") as f:
    f.write(full_yaml)
print("Wrote clean YAML to", out_path)
