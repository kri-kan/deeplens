const fs = require('fs');

const files = [
  "app/utilities/order-details/[id].tsx",
  "components/utility/instagram/InstagramPostDetailItem.tsx",
  "components/utility/instagram/MetaConfigurationsTable.tsx",
  "components/utility/vendor/VendorAddressesModal.tsx",
  "components/utility/youtube/YoutubeShortsScheduleForm.tsx",
  "hooks/useInstagramExplorer.ts",
  "hooks/useWhatsAppBroadcast.ts",
  "services/ai.service.ts"
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  for(let i=0; i<lines.length; i++) {
     if (lines[i].includes('catch {')) {
        let block = lines.slice(i, i+15).join('\n');
        if (block.match(/\berror\b/)) {
            lines[i] = lines[i].replace('catch {', 'catch (error) {');
        } else if (block.match(/\berr\b/)) {
            lines[i] = lines[i].replace('catch {', 'catch (err) {');
        } else if (block.match(/\be\b/)) {
            lines[i] = lines[i].replace('catch {', 'catch (e) {');
        }
     }
  }
  fs.writeFileSync(file, lines.join('\n'));
}
