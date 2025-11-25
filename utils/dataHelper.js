import path from "path";
import xlsx from "xlsx";

export function getTestData(testCaseId) {
  const filePath = path.join(process.cwd(), "/test-data/sscData.xlsx");
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  return data.find(row => row.TestCase === testCaseId); // find row by test case ID
}

export function getNameMail(rowid) {
  const filePath = path.join(process.cwd(), "/test-data/sscData.xlsx");
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[1];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  return data[rowid]; // return data by rowid
}
