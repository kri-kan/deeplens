const fs = require('fs');
const execSync = require('child_process').execSync;

try {
  const output = execSync('npx eslint --rule "react-hooks/exhaustive-deps: off" --rule "import/no-named-as-default: off" --format json .', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
  processOutput(output);
} catch (e) {
  // eslint exits with 1 if there are warnings/errors
  processOutput(e.stdout);
}

function processOutput(output) {
  const data = JSON.parse(output);

  data.forEach(file => {
    if (file.messages.length === 0) return;
    let content = fs.readFileSync(file.filePath, 'utf8');
    let lines = content.split('\n');
    
    let messages = file.messages.filter(m => m.ruleId === 'unused-imports/no-unused-vars');
    // Sort descending so modifications don't mess up line numbers if we were to add/remove lines
    messages.sort((a, b) => b.line - a.line);
    
    messages.forEach(msg => {
      let lineIdx = msg.line - 1;
      let varNameMatch = msg.message.match(/'([^']+)'/);
      if (!varNameMatch) return;
      let varName = varNameMatch[1];
      
      let line = lines[lineIdx];
      
      if (msg.message.includes('assigned a value but never used')) {
          if (line.includes('const ' + varName)) {
             line = line.replace('const ' + varName, '// const ' + varName);
          } else if (line.includes('let ' + varName)) {
             line = line.replace('let ' + varName, '// let ' + varName);
          } else {
             // Fallback prefix
             line = line.replace(new RegExp('\\b' + varName + '\\b'), '_' + varName);
          }
      } 
      else if (msg.message.includes('defined but never used')) {
          line = line.replace(new RegExp('\\b' + varName + '\\b'), '_' + varName);
      }
      lines[lineIdx] = line;
    });
    
    fs.writeFileSync(file.filePath, lines.join('\n'));
  });
}
