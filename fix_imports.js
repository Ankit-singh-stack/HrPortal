const fs = require('fs');
const path = require('path');

function processDir(dir, depth = 0) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath, depth + 1);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      if (fullPath.includes('services\\api.js') || fullPath.includes('services/api.js')) continue;
      
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes("import axios from 'axios'") || content.includes('import axios from "axios"')) {
        let relativePath = '';
        if (depth === 1) relativePath = '../services/api'; // e.g. src/pages/ -> depth 1 relative to src
        else if (depth === 2) relativePath = '../../services/api'; // e.g. src/components/hr/ -> depth 2
        else relativePath = '../../../services/api'; // just in case
        
        content = content.replace(/import axios from ['"]axios['"];?/g, `import axios from '${relativePath}';`);
        fs.writeFileSync(fullPath, content);
        console.log('Fixed ' + fullPath);
      }
    }
  }
}

processDir(path.join(process.cwd(), 'client/src'), 0);
