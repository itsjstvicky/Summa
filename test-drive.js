const driveFileRegex = /drive\.google\.com\/file\/d\/([^\/]+)/;
const url = "https://drive.google.com/file/d/1vG-65W1GZtY2-aXkQ0_Tls9_b5yZ/view?usp=sharing";
const match = url.match(driveFileRegex);
console.log(match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800` : url);
