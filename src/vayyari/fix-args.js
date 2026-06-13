const fs = require('fs');
const execSync = require('child_process').execSync;

const output = execSync('npx eslint --rule "react-hooks/exhaustive-deps: off" --rule "import/no-named-as-default: off" --format json .', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).toString();

const data = JSON.parse(output);

data.forEach(file => {
  if (file.messages.length === 0) return;
  let content = fs.readFileSync(file.filePath, 'utf8');
  
  // Replace catch (_err) -> catch
  content = content.replace(/catch\s*\(\s*_[eE]rr(or)?\s*\)/g, 'catch');
  content = content.replace(/catch\s*\(\s*_[eE]\s*\)/g, 'catch');
  
  fs.writeFileSync(file.filePath, content);
});
