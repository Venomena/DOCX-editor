const formidable = require("formidable");
const fs = require("fs");
const path = require("path");
const { Document, Packer, Paragraph } = require("docx");
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const processFile = (file, instructions) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;
      const doc = await Document.load(arrayBuffer);

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `Edit the following text: "${doc.getText()}" with these instructions: "${instructions}"`
          }
        ],
        model: "mixtral-8x7b-32768"
      });

      const editedText = chatCompletion.choices[0]?.message?.content || "No content";
      const newDoc = new Document();
      newDoc.addParagraph(new Paragraph(editedText));

      const buffer = await Packer.toBuffer(newDoc);
      resolve(buffer);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export default async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send({ message: "Only POST requests allowed" });
    return;
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(500).send({ message: "Error parsing form" });
      return;
    }

    const { instructions } = fields;
    const { file } = files;

    try {
      const editedBuffer = await processFile(file, instructions);

      const outputPath = path.join("/tmp", `${Date.now()}-edited.docx`);
      fs.writeFileSync(outputPath, editedBuffer);

      res.status(200).json({ message: "File edited successfully", downloadUrl: outputPath });
    } catch (error) {
      res.status(500).send({ message: "Error processing file" });
    }
  });
};
