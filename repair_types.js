import fs from "fs";

let code = fs.readFileSync("src/integrations/supabase/types.ts", "utf8");

function removeDuplicates(table) {
  const blockRegex = new RegExp(`(${table}:\\s*\\{.*?\\})(?=\\n\\s*[a-z_]+:\\s*\\{)`, 's');
  code = code.replace(blockRegex, (match) => {
    let lines = match.split('\n');
    let seen = new Set();
    let res = [];
    for (let line of lines) {
      let trimmed = line.trim();
      let keyMatch = trimmed.match(/^([a-zA-Z_]+)\??:/);
      if (keyMatch) {
        let key = keyMatch[1];
        if (['qualifications', 'work_experience', 'interests'].includes(key)) {
          if (seen.has(key)) continue;
          seen.add(key);
        }
      }
      if (trimmed === 'Row: {' || trimmed === 'Insert: {' || trimmed === 'Update: {') {
        seen.clear(); // Reset seen keys for each block
      }
      res.push(line);
    }
    return res.join('\n');
  });
}

removeDuplicates('trainees');
removeDuplicates('trainers');

function injectFields(table, block, toInject) {
  const regex = new RegExp("(" + table + ":\\s*\\{.*?\\b" + block + ":\\s*\\{.*?)(        \\})", "s");
  code = code.replace(regex, "$1" + toInject + "\n$2");
}

// Restore missing fields from prior session
injectFields("assessments", "Row", "          results_publish_date?: string | null");
injectFields("assessments", "Insert", "          results_publish_date?: string | null");
injectFields("assessments", "Update", "          results_publish_date?: string | null");

injectFields("questions", "Row", '          question_type?: "open_ended" | "mcq"');
injectFields("questions", "Insert", '          question_type?: "open_ended" | "mcq"');
injectFields("questions", "Update", '          question_type?: "open_ended" | "mcq"');

injectFields("assessment_attempts", "Row", "          grade_status?: string");
injectFields("assessment_attempts", "Insert", "          grade_status?: string");
injectFields("assessment_attempts", "Update", "          grade_status?: string");


fs.writeFileSync("src/integrations/supabase/types.ts", code);
console.log("Repair Done");
