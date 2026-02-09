
const datePattern = /(\d{4})(?:\s*[年./-]\s*(\d{1,2}))?[月]?\s*(?:[-–至到~—]|\s+-\s+)\s*(?:(\d{4})(?:\s*[年./-]\s*(\d{1,2}))?[月]?|至今|现在|present)?/i;
const line = "◆ 2023.01 - 2023.06  |  Cool Project  |  Lead";

const match = line.match(datePattern);
console.log("Match:", match);

if (match) {
    console.log("Date found!");
} else {
    console.log("Date NOT found.");
}
