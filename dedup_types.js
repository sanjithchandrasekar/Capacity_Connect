import fs from "fs";

let code = fs.readFileSync("src/integrations/supabase/types.ts", "utf8");
let lines = code.split("\n");
let inBlock = null;
let seenKeys = new Set();
let newLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let trimmed = line.trim();
  
  if (trimmed.endsWith(": {")) {
    inBlock = trimmed.split(":")[0];
    seenKeys.clear();
  }
  
  let match = trimmed.match(/^([a-zA-Z_]+)\??:/);
  if (match) {
    let key = match[1];
    if (seenKeys.has(key)) {
      continue; // skip duplicate key in this block
    }
    seenKeys.add(key);
  }
  
  newLines.push(line);
}

fs.writeFileSync("src/integrations/supabase/types.ts", newLines.join("\n"));
console.log("Deduplication Done");
