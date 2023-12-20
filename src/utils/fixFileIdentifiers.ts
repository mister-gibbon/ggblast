import _ from 'lodash';
import fs from 'fs';
import readline from 'readline';

const fixFileIdentifiers = async (inputFileName: string, outputFileName: string): Promise<void> => {
  const inputStream = fs.createReadStream(inputFileName);
  const rl = readline.createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });
  const outputStream = fs.createWriteStream(outputFileName, { flags: 'a+' });
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.
  let index = 0;
  for await (const line of rl) {
    const fixedLine = _.replace(line, /\|/g, '_') + '\n';
    outputStream.write(fixedLine);
    // Each line in input.txt will be successively available here as `line`.
    index += 1;
    if (index % 100000 === 0) {
      console.log(index);
    }
  }
  outputStream.close();
};

const go = async () => {
  await fixFileIdentifiers('AACZ04.fa', 'AACZ04_fixed.fa');
};

go();
