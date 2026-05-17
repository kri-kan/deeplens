# Reusable AI Prompt: Multi-Lingual WhatsApp Campaign Message Generator

This prompt is designed for LLMs (like Gemini or Claude) to generate high-converting, warm, and highly colloquial multi-lingual campaign messages for the **VAYYARI Fashions** WhatsApp community. 

Copy and paste the prompt below directly into your AI assistant. It will output a pristine, copy-paste-ready JSON array that matches the Vayyari platform database schema perfectly. You can paste the output directly into the campaign step's message templates input.

---

## 📋 The Prompt Template

```markdown
You are an expert copywriter specializing in social commerce, boutique fashion brands (specifically Indian ethnic/modern fusion wear like VAYYARI Fashions), and localized conversational marketing.

Your task is to generate marketing messages for a multi-step WhatsApp campaign to invite our Instagram followers and customers to join our brand-new WhatsApp Community and encourage them to refer their friends.

### 🌟 Brand Profile: VAYYARI Fashions
- Tone: Extremely warm, friendly, premium, and stylish. Welcoming but fashionable.
- Aesthetic: Graceful, modern, and ethnic-focused (uses emojis like 🌸, 👗, 🛍️, 👑, 👭, 🎁, 💸, 🚨, ✨).
- Audience: Young and modern fashion enthusiasts who love ethnic wear, aesthetics, and personalized shopping updates.

### 🎯 Campaign Workflow (2 Steps)

#### **Step 1: Community Invite**
- **Objective:** Invite customers to join our official WhatsApp Community.
- **Invite Link:** https://chat.whatsapp.com/JvL2RDTzCaYEWbBCkxBtAE
- **Core Benefits to highlight:**
  1. See new designs first (exclusive first-look).
  2. Get easy, spam-free updates directly on their phone.
  3. Joining is completely free, secure, and simple.

#### **Step 2: Referral Reward Program**
- **Objective:** Encourage community members to share the group link with friends along with their unique invite code.
- **Invite Link:** https://chat.whatsapp.com/JvL2RDTzCaYEWbBCkxBtAE
- **Placeholder for Unique Invite Code:** `{{inviteCode}}`
- **Double-Sided Reward Details:**
  - **The Friend Saves:** 10% OFF (up to ₹100) on their first order.
  - **The Referrer Earns:** A ₹50 coupon when the friend makes their first purchase.

---

### 🌐 Language & Localization Guidelines
We support multiple language codes in our system. Non-English languages MUST be written in the Latin alphabet (transliterated English/colloquial text) to mimic real-world informal chat behavior (e.g. Hinglish, Telglish, Tanglish). Do not use native scripts (e.g. Devnagari or Telugu script) unless explicitly asked.

| Language Code | Name | Tone & Translite Style |
|---|---|---|
| `en-in` | English (India) | Natural, trendy Indian-English. Smart, upbeat, and welcoming. |
| `te-in` | Telugu (Colloquial) | "Telglish" (Telugu written in English script with common English words integrated). |
| `hi-in` | Hindi (Colloquial) | "Hinglish" (Hindi written in English script with a friendly, casual vibe). |
| `ta-in` | Tamil (Colloquial) | "Tanglish" (Tamil written in English script, conversational and high-energy). |
| `ml-in` | Malayalam (Colloquial) | "Manglish" (Malayalam written in English script, warm and inviting). |
| `kn-in` | Kannada (Colloquial) | "Kanglish" (Kannada written in English script, respectful and trendy). |
| `en-te` | English & Telugu Mix | An equal, highly natural everyday blend of English and Telugu conversational phrases. |

---

### 📥 Output Schema
Produce the output strictly as a valid JSON array of objects following this TypeScript interface:
```typescript
interface MessageTemplate {
  templateName: string; // Formatting: "step_<stepNumber>_<type>_v<variationNumber>" (e.g., "step_1_invite_v1")
  languageCode: string; // The exact language code from the table above (e.g., "en-in", "te-in", "en-te")
  body: string;         // The text of the message, including line breaks (\n) and emojis
}
```

### 📝 Key Instructions for Variations & Randomization
Our mobile app randomly selects one of the eligible language templates to display by default to each customer, and lets the operator cycle through variations using a reload button.
To make this work beautifully, you MUST:
1. Generate **multiple variations** (e.g., `_v1`, `_v2`, `_v3`, `_v4`) for each language code.
2. Vary the tone and length for each variation (e.g., Short & Punchy, Elegant & VIP, Community-focused, Direct & Value-driven) so they provide genuine choice.
3. Keep the template names matching the format: `step_<stepNumber>_<type>_v<variationNumber>` (e.g., `step_1_invite_v1`, `step_1_invite_v2` for `en-in`, and `step_1_invite_v1`, `step_1_invite_v2` for `te-in`).

### 💡 Output Formatting Constraint
- Output ONLY the raw JSON array.
- Do NOT add markdown code blocks like ```json ... ``` or any conversational preamble/postamble.
- Ensure all line breaks in the message body are properly escaped as `\n` inside the JSON strings.

### 🌟 Few-Shot Output Example:
[
  {
    "templateName": "step_1_invite_v1",
    "languageCode": "en-in",
    "body": "Hey beautiful! ✨\n\nWant a sneak peek into our latest collections before everyone else? 👗🛍️\n\nJoin our exclusive VAYYARI WhatsApp Community now! It's spam-free and strictly for first-looks: https://chat.whatsapp.com/JvL2RDTzCaYEWbBCkxBtAE \n\nSee you inside! 🌸"
  },
  {
    "templateName": "step_1_invite_v2",
    "languageCode": "en-in",
    "body": "Hey there! 🌸\n\nWe've just launched our official WhatsApp group where we share styling updates and VIP updates first! 👑✨\n\nClick the link to join us for free: https://chat.whatsapp.com/JvL2RDTzCaYEWbBCkxBtAE \n\nNo spam, promise! 👭"
  },
  {
    "templateName": "step_1_invite_v1",
    "languageCode": "te-in",
    "body": "Hey gorgeous! ✨\n\nLatest designs and collection updates anni direct-ga chuseyali anukuntunnara? 👗🛍️\n\nMana exclusive VAYYARI WhatsApp Community-lo join aipondi click chesi: https://chat.whatsapp.com/JvL2RDTzCaYEWbBCkxBtAE \n\nNo spam updates inside! 🌸"
  }
]
```
