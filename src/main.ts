import _ from 'lodash';
import fs from 'fs';
import { parseStream } from '@fast-csv/parse';
import prompts from 'prompts';
import chalk from 'chalk';
import { capitalizeFastaFile } from './utils/capitalizeFastaFile';
import { getMethodParamsMap, getMethodPromptChoices } from './utils/methodParamsMap';
import cliProgress from 'cli-progress';
import { generateRandomFile } from './utils/generateRandomFile';
import { getDatabaseEntries } from './utils/getDatabaseEntries';
import { runBlastCommand } from './utils/runBlastCommand';
import {
  BLAST_INSTALL_PATH,
  DATABASES_PATH,
  FASTA_FILES_DIR_PATH,
  RANDOM_FILES_PATH,
  RESULTS_PATH,
} from './utils/constants';
import { getVariablesFromCSV } from './utils/getVariablesFromCSV';

const createRandomFileName = ({
  database1,
  accessionId1,
  numToGenerate,
  randomSliceLength,
}: {
  database1: string;
  accessionId1: string;
  numToGenerate: number;
  randomSliceLength: number;
}) => `${RANDOM_FILES_PATH}/random-${database1}-${accessionId1}-${numToGenerate}x${randomSliceLength}.fa`;

const createFolderIfItDoesNotExist = (folderName: string) => {
  const files = fs.readdirSync('.');
  if (!_.includes(files, folderName)) {
    fs.mkdirSync(folderName);
  }
};

const createDBFromFaFile = async (dbName: string) => {
  const files = fs.readdirSync(DATABASES_PATH);
  if (!_.includes(files, `${dbName}.nhr`)) {
    console.log(`Creating DB from file: ${dbName}.fa...`);
    try {
      await runBlastCommand(
        `makeblastdb -in ${FASTA_FILES_DIR_PATH}/${dbName}.fa -dbtype nucl -title ${dbName} -out ${DATABASES_PATH}/${dbName} -parse_seqids`,
      );
    } catch (error) {
      console.error(error);
      console.log('Error creating database. Trying again without "-parse_seqids" ...');
      await runBlastCommand(
        `makeblastdb -in ${FASTA_FILES_DIR_PATH}/${dbName}.fa -dbtype nucl -title ${dbName} -out ${DATABASES_PATH}/${dbName}`,
      );
    }
    console.log(`Created DB from file: ${dbName}.fa`);
  } else {
    console.log(`Using existing DB for file: ${dbName}.fa`);
  }
};

/*
%a means accession
%l means sequence length
%f means sequence in FASTA format
%s means sequence data (without defline)
%g means gi
%o means ordinal id (OID)
%i means sequence id
%t means sequence title
%h means sequence hash value
%T means taxid
%X means leaf-node taxids
%e means membership integer
%L means common taxonomic name
%C means common taxonomic names for leaf-node taxids
%S means scientific name
%N means scientific names for leaf-node taxids
%B means BLAST name
%K means taxonomic super kingdom
%P means PIG
%m means sequence masking data.
*/

const countLines = async (filePath: string): Promise<number> => {
  // function copied from http://stackoverflow.com/questions/12453057/node-js-count-the-number-of-lines-in-a-file
  // with very few modifications
  let i;
  let count = 0;
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .on('error', e => reject(e))
      .on('data', chunk => {
        for (i = 0; i < chunk.length; ++i) {
          if (chunk[i] == 10) {
            count++;
          }
        }
      })
      .on('end', () => resolve(count));
  });
};

const progressBarState: { bar: cliProgress.SingleBar | null } = { bar: null };

const startChecker = (resultFileName: string, expectedTotalLines: number) => {
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBarState.bar = progressBar;
  progressBar.start(expectedTotalLines, 0);
  const interval = setInterval(async () => {
    const lines = await countLines(resultFileName);
    progressBar.update(lines);
  }, 5000);
  return interval;
};

const stopChecker = (interval: NodeJS.Timeout) => {
  clearInterval(interval);
  progressBarState.bar?.stop();
};

const compareRandomFileToDB = async ({
  database1,
  accessionId1,
  numToGenerate,
  database2,
  method,
}: {
  database1: string;
  accessionId1: string;
  numToGenerate: number;
  database2: string;
  method: string;
}) => {
  const variables = getVariablesFromCSV();
  const randomFileName = createRandomFileName({
    database1,
    accessionId1,
    numToGenerate,
    randomSliceLength: variables.RANDOM_SLICE_LENGTH,
  });
  const params = getMethodParamsMap()[method];
  console.log(
    `Method: ${method}. Comparing ${numToGenerate} random sequences from entry ${accessionId1} in ${database1} to ${database2}...`,
  );
  const resultFileName = `${RESULTS_PATH}/result-x${numToGenerate}x${variables.RANDOM_SLICE_LENGTH}-from-${database1}-${accessionId1}-to-${database2}-${method}.csv`;
  const checkerInterval = startChecker(resultFileName, numToGenerate);
  const blastCommand = `blastn -query ${randomFileName} -db ${DATABASES_PATH}/${database2} ${params} -num_threads 99 -out ${resultFileName}`;
  await runBlastCommand(blastCommand);
  stopChecker(checkerInterval);
  console.log(
    `DONE Method: ${method}. Comparing ${numToGenerate} random sequences from entry ${accessionId1} in ${database1} to ${database2}. Created file: ${resultFileName}`,
  );
  console.log(`Raw Blast Command: "./${BLAST_INSTALL_PATH}/${blastCommand}"`);
  return resultFileName;
};

const generateComparisonPercentagesFromCSVFile = async (
  resultFileName: string,
): Promise<{ weighted: string; unweighted: string; tomkinsWeighted: string }> => {
  return new Promise((resolve, reject) => {
    const csvStream = fs.createReadStream(resultFileName);
    let nidentSum = 0;
    let lengthSum = 0;
    let pidentSum = 0;
    let qlenSum = 0;
    let totalLength = 0;
    parseStream(csvStream)
      .on('error', error => {
        console.error(error);
        reject(error);
      })
      .on('data', row => {
        const [qseqid, qstart, qend, mismatch, gapopen, pident, nident, length, qlen] = row;
        nidentSum += _.parseInt(nident);
        lengthSum += _.parseInt(length);
        pidentSum += parseFloat(pident);
        qlenSum += _.parseInt(qlen);
        totalLength += 1;
      })
      .on('end', () => {
        resolve({
          weighted: `${((nidentSum / lengthSum) * 100).toFixed(2)}%`,
          unweighted: `${(pidentSum / totalLength).toFixed(2)}%`,
          tomkinsWeighted: `${((lengthSum / qlenSum) * 100).toFixed(2)}%`,
        });
      });
  });
};

const runComparison = async ({
  accessionId1,
  method,
  numToGenerate,
  database1,
  database2,
}: {
  database1: string;
  accessionId1: string;
  numToGenerate: number;
  database2: string;
  method: 'good' | 'tomkins2013' | 'tomkins2018';
}) => {
  const variables = getVariablesFromCSV();
  const randomFileName = createRandomFileName({
    database1,
    accessionId1,
    numToGenerate,
    randomSliceLength: variables.RANDOM_SLICE_LENGTH,
  });
  await generateRandomFile(database1, accessionId1, numToGenerate, randomFileName);
  const resultFileName = await compareRandomFileToDB({
    accessionId1,
    database1,
    database2,
    method,
    numToGenerate,
  });

  const comparisonPercentages = await generateComparisonPercentagesFromCSVFile(resultFileName);

  const comparisonPercentageCsvPath = `${RESULTS_PATH}/comparison-percentage.csv`;
  // check if comparison percentage csv exists, create it if not
  if (!fs.existsSync(comparisonPercentageCsvPath)) {
    fs.writeFileSync(
      comparisonPercentageCsvPath,
      'Result File Name,Weighted Similarity,Unweighted Similarity,Tomkins Similarity\n',
      {
        flag: 'a+',
      },
    );
  }
  // append results to comparison percentage csv
  fs.writeFileSync(
    `${RESULTS_PATH}/comparison-percentage.csv`,
    `${resultFileName},${comparisonPercentages.weighted},${comparisonPercentages.unweighted},${comparisonPercentages.tomkinsWeighted}\n`,
    {
      flag: 'a+',
    },
  );

  console.log(`
--------------------
Method: ${method}
Random sequence count: ${numToGenerate}
FROM Database: ${database1}
FROM Chromosome: ${accessionId1}
TO Database: ${database2}

Weighted Similarity: ${chalk.bold.green(comparisonPercentages.weighted)}
Unweighted Similarity: ${chalk.bold.white(comparisonPercentages.unweighted)}
Tomkins Similarity: ${chalk.bold.red(comparisonPercentages.tomkinsWeighted)}
--------------------`);
};

const INVALID_COMMAND_LINE_ARGS_ERROR_TEXT = `Error: Invalid command line arguments.
    
Valid usage examples:
ggblast-win.exe
ggblast-win.exe --capitalize-file fileToCapitalize.fa
`;

const go = async () => {
  const commandLineArgs = process.argv.slice(2);
  const capitalizeFileIndex = _.findIndex(commandLineArgs, arg => arg === '--capitalize-file');
  if (capitalizeFileIndex !== -1) {
    const fileName = commandLineArgs[capitalizeFileIndex + 1];
    if (!fileName) {
      console.error(INVALID_COMMAND_LINE_ARGS_ERROR_TEXT);
      return;
    }
    await capitalizeFastaFile(fileName);
    return;
  }
  if (commandLineArgs.length > 0) {
    console.error(INVALID_COMMAND_LINE_ARGS_ERROR_TEXT);
    return;
  }
  const fastaFiles = fs.readdirSync(FASTA_FILES_DIR_PATH).filter(fileName => _.endsWith(fileName, '.fa'));
  const databasesResponse = await prompts(
    [
      {
        type: 'select',
        name: 'database1File',
        message: 'Pick a database to compare FROM',
        choices: _.map(fastaFiles, fileName => ({ title: fileName, value: fileName })),
      },
      {
        type: 'select',
        name: 'database2File',
        message: 'Pick a database to compare TO',
        choices: prev => _.map(_.without(fastaFiles, prev), fileName => ({ title: fileName, value: fileName })),
      },
    ],
    {
      onCancel: () => {
        throw new Error('Cancelled');
      },
    },
  );
  console.log('');
  createFolderIfItDoesNotExist(RESULTS_PATH);
  createFolderIfItDoesNotExist(RANDOM_FILES_PATH);
  createFolderIfItDoesNotExist(DATABASES_PATH);
  const database1 = _.replace(databasesResponse.database1File, '.fa', '');
  const database2 = _.replace(databasesResponse.database2File, '.fa', '');
  await createDBFromFaFile(database1);
  await createDBFromFaFile(database2);
  const database1Entries = await getDatabaseEntries(database1);
  const database2Entries = await getDatabaseEntries(database2);
  const overlappingAccessionIds = _.map(
    _.intersectionBy(database1Entries, database2Entries, 'accessionId'),
    entry => entry.accessionId,
  );
  const response = await prompts(
    [
      {
        type: 'autocomplete',
        name: 'accessionId1',
        message: () =>
          `Pick an entry to compare FROM${
            _.isEmpty(overlappingAccessionIds) ? '' : ` or overlapping (${overlappingAccessionIds.join(',')})`
          } or all (all entries in the FROM database)`,
        suggest: (input, choices) => choices.filter(i => i.title.toLowerCase().includes(input.toLowerCase())) as any,
        choices: _.compact([
          { title: 'all', value: 'all' },
          _.isEmpty(overlappingAccessionIds) ? null : { title: 'overlapping', value: 'overlapping' },
          ..._.map(database1Entries, ({ accessionId }) => ({ title: accessionId, value: accessionId })),
        ]),
      },
      {
        type: 'number',
        name: 'numToGenerate',
        message: 'Choose how many random sequences to generate',
        initial: 10,
      },
      {
        type: 'select',
        name: 'method',
        message: 'Pick a method to use',
        choices: getMethodPromptChoices(),
      },
    ],
    {
      onCancel: () => {
        throw new Error('Cancelled');
      },
    },
  );
  console.log('');
  const isOverlapping = response.accessionId1 === 'overlapping';
  const isAll = response.accessionId1 === 'all';
  let accessionIds = isOverlapping
    ? overlappingAccessionIds
    : isAll
    ? database1Entries.map(entry => entry.accessionId)
    : [response.accessionId1 as string];

  const IS_PARALLEL = false;
  const CHUNK_SIZE = 3;
  const chunks = _.chunk(accessionIds, CHUNK_SIZE);
  if (IS_PARALLEL) {
    for (let chunk of chunks) {
      await Promise.all(
        _.map(chunk, accessionId1 =>
          runComparison({
            accessionId1,
            database1,
            database2,
            method: response.method,
            numToGenerate: response.numToGenerate,
          }),
        ),
      );
    }
  } else {
    for (let accessionId1 of accessionIds) {
      await runComparison({
        accessionId1,
        database1,
        database2,
        method: response.method,
        numToGenerate: response.numToGenerate,
      });
    }
  }
};

go();
