const formidable = require("formidable");
const fs = require("fs");
const path = require("path");
const { Document, Packer, Paragraph } = require("docx");
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const processFile = async (filePath, instructions) => {
  try {
    console.log("Reading file:", filePath);
    const data = fs.readFileSync(filePath);
    console.log("File data read successfully:", data.length, "bytes");

    const doc = await Document.load(data);
    console.log("Document loaded successfully");

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Edit the following text: "${doc.getText()}" with these instructions: "${instructions}"`,
        },
      ],
      model: "mixtral-8x7b-32768",
    });

    const editedText = chatCompletion.choices[0]?.message?.content || "No content";
    const newDoc = new Document();
    newDoc.addParagraph(new Paragraph(editedText));
    console.log("Document edited successfully");

    const buffer = await Packer.toBuffer(newDoc);
    console.log("Document packed successfully");

    return buffer;
  } catch (error) {
    console.error("Error processing document:", error);
    throw error;
  }
};

export default async (req, res) => {
  console.log("Received request:", req.method, req.url);
  if (req.method !== "POST") {
    console.log("Invalid request method:", req.method);
    return res.status(405).json({ message: "Only POST requests allowed" });
  }

  const form = new formidable.IncomingForm();
  form.uploadDir = "/tmp";
  form.keepExtensions = true;

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Error parsing form:", err);
      return res.status(500).json({ message: "Error parsing form" });
    }

    const { instructions } = fields;
    const file = files.file;

    console.log("Parsed fields:", fields);
    console.log("Parsed files:", files);

    if (!file || !file.path) {
      console.error("No file or file path provided:", file);
      return res.status(400).json({ message: "File not provided or file path missing" });
    }

    try {
      const editedBuffer = await processFile(file.path, instructions);
      const outputPath = path.join("/tmp", `${Date.now()}-edited.docx`);
      fs.writeFileSync(outputPath, editedBuffer);
      console.log("File saved successfully:", outputPath);

      return res.status(200).json({ message: "File edited successfully", downloadUrl: `/api/download?path=${encodeURIComponent(outputPath)}` });
    } catch (error) {
      console.error("Error processing file:", error);
      return res.status(500).json({ message: "Error processing file" });
    }
  });
};
