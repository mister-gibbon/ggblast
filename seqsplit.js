/**
 * This is a javascript version of seqsplit.py, which runs very slowly.
 */
const fs = require('fs');

const cliArgs = process.argv.slice(2);
// const regex = new RegExp(' |>.*$|\\d|\\t|\\n|N|n');
const regex = / |>.*$|\d|\t|\n|N|n/g;

if (cliArgs.length !== 2) {
  console.log('Error! Two arguments needed: input file name and desired sequence length.');
  console.log({ cliArgs });
  process.exit(1);
}

const inFileName = cliArgs[0];
const splitLength = parseInt(cliArgs[1]);
let fullSequence = '';
const maxSplits = 10; // null
const maxSequenceLength = maxSplits ? splitLength * maxSplits : Number.MAX_SAFE_INTEGER;

// Open files for read/write
const fi = fs.readFileSync(inFileName, 'utf8');

// For each line in input file do regex removal
const lines = fi.split('\n');
let count = 0;
for (const line of lines) {
  fullSequence += line.replace(regex, '');
  count++;
  if (count % 1000 === 0) {
    console.log(`Line ${count} / ${lines.length}`);
  }
}

const writeFile = inFileName + '_split_' + splitLength + (maxSplits ? `x${maxSplits}` : '') + '.fa';
// delete writeFile if it exists
if (fs.existsSync(writeFile)) {
  fs.unlinkSync(writeFile);
}
const fo = fs.createWriteStream(writeFile);

// Parse the new fasta file
for (let i = 0; i < Math.min(fullSequence.length, maxSequenceLength); i += splitLength) {
  // print the starting character and add the character count number for each sequence substring
  const outLine = '>' + i + '\n';
  fo.write(outLine);
  // get the substring of specified length
  const outSeq = fullSequence.substring(i, i + splitLength);
  // take that substring and break it up into lines of 70 characters for output
  for (let j = 0; j < outSeq.length; j += 70) {
    const line = outSeq.substring(j, j + 70) + '\n';
    fo.write(line);
  }
}

// Close files and exit
fo.end();
