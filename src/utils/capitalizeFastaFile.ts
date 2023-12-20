import _ from 'lodash';
import fs from 'fs';
import readline from 'readline';

export const capitalizeFastaFile = async (inputFileName: string): Promise<void> => {
  const inputStream = fs.createReadStream(inputFileName);
  const rl = readline.createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });
  const outputFileName = _.replace(inputFileName, '.fa', '_capitalized.fa');
  const outputStream = fs.createWriteStream(outputFileName);
  console.log(`Capitalizing file: ${inputFileName} to ${outputFileName}...`);
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.
  let index = 0;
  for await (const line of rl) {
    const isSequenceLine = _.includes(line, '>');
    if (isSequenceLine) {
      outputStream.write(line + '\n');
    } else {
      const capitalizedLine = _.toUpper(line);
      if (line !== capitalizedLine) {
        console.log('Capitalizing line: ' + line + ' to ' + capitalizedLine);
      }
      outputStream.write(capitalizedLine + '\n');
    }
    index += 1;
    if (index % 100000 === 0) {
      console.log(index);
    }
  }
  await new Promise((resolve, reject) => {
    outputStream.close(err => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  console.log(`DONE Capitalizing file: ${inputFileName} to ${outputFileName}`);
};
