
import { parseDocxContent } from './src/utils/docxParser.js';

const mockText = `
John Doe
Senior Developer
john@example.com
13800138000

Summary
Experienced developer...

Experience
◆ 2020.01 - Present  |  Tech Corp  |  Senior Dev
Did some cool stuff.

Projects
◆ 2023.01 - 2023.06  |  Cool Project  |  Lead
Built a cool app.

Skills
◆ React
◆ Node.js
◆ JavaScript
`;

console.log("Testing English Parsing...");
const result = parseDocxContent(mockText);

console.log("Projects found:", result.projects.length);
if (result.projects.length > 0) {
    console.log("Project 1:", result.projects[0].name, result.projects[0].role);
} else {
    console.log("PROJECTS MISSING!");
}

console.log("Skills found:", result.skills.length);
console.log("Skills list:", result.skills);

if (result.projects.length > 0 && result.skills.length > 0) {
    console.log("SUCCESS: Both Projects and Skills extracted.");
} else {
    console.log("FAILURE: Missing sections.");
}
