import fs from 'fs';
import _ from 'lodash';
import cliProgress from 'cli-progress';
import { getDatabaseEntries } from './getDatabaseEntries';
import { runBlastCommand } from './runBlastCommand';
import { DATABASES_PATH } from './constants';
import { getVariablesFromCSV } from './getVariablesFromCSV';

/**
 * This is the original way that we did this, but it's slow because it requires a separate call to blastdbcmd for each substring.
 */
const _computeChromosomeSubstringWithBlastdbcmd = ({
  database,
  accessionId,
  startIndex,
  randomSliceLength,
}: {
  database: string;
  accessionId: string;
  startIndex: number;
  randomSliceLength: number;
}) => {
  const endIndex = startIndex + randomSliceLength - 1;
  return runBlastCommand(
    `blastdbcmd -db ${DATABASES_PATH}/${database} -entry ${accessionId} -range ${startIndex}-${endIndex}`,
  );
};

const computeChromosomeSubstring = async ({
  startIndex,
  fullChromosomeBasePairsFirstLine,
  fullChromosomeBasePairsWithoutFirstLine,
  randomSliceLength,
}: {
  startIndex: number;
  fullChromosomeBasePairsFirstLine: string;
  fullChromosomeBasePairsWithoutFirstLine: string;
  randomSliceLength: number;
}) => {
  const endIndex = startIndex + randomSliceLength - 1;
  const substringResult = fullChromosomeBasePairsWithoutFirstLine.substring(startIndex - 1, endIndex);
  const substringResultFirstLine = fullChromosomeBasePairsFirstLine.replace(' ', `:${startIndex}-${endIndex} `);
  const fullResult =
    substringResultFirstLine +
    '\n' +
    _.chunk(substringResult, 80)
      .map(chunk => chunk.join(''))
      .join('\n') +
    '\n';
  return fullResult;
};

const generateRandomString = async ({
  maxLength,
  fullChromosomeBasePairsFirstLine,
  fullChromosomeBasePairsWithoutFirstLine,
  randomSliceLength,
}: {
  maxLength: number;
  fullChromosomeBasePairsFirstLine: string;
  fullChromosomeBasePairsWithoutFirstLine: string;
  randomSliceLength: number;
}) => {
  while (true) {
    const randStart = Math.floor(Math.random() * maxLength);
    const randEnd = randStart + randomSliceLength - 1;
    if (randEnd < maxLength) {
      const result = await computeChromosomeSubstring({
        startIndex: randStart,
        fullChromosomeBasePairsFirstLine,
        fullChromosomeBasePairsWithoutFirstLine,
        randomSliceLength,
      });
      const resultWithoutFirstLine = _.split(result, '\n').slice(1).join('');
      if (!_.includes(resultWithoutFirstLine, 'N')) {
        return result;
      }
    }
  }
};
export const generateRandomFile = async (
  database: string,
  accessionId: string,
  numToGenerate: number,
  randomFileName: string,
): Promise<{ success: true } | { success: false; error: string }> => {
  try {
    fs.readFileSync(randomFileName);
    console.log(
      `Using existing random file "${randomFileName}". If you want to regenerate it, delete the file (or rename it if you want a record) before running.`,
    );
    return { success: false, error: 'File already exists' };
  } catch (error) {
    const { RANDOM_SLICE_LENGTH } = getVariablesFromCSV();
    const databaseEntries = await getDatabaseEntries(database);
    const foundChromosome = _.find(databaseEntries, chromosome => chromosome.accessionId === accessionId);
    if (!foundChromosome) {
      const error = `Could not find chromosome ${accessionId} in database ${database}, possible chromosomes were: [${_.map(
        databaseEntries,
        entry => entry.accessionId,
      ).join(', ')}]`;
      console.error(error);
      return { success: false, error };
    }
    console.log(
      `Generating ${numToGenerate} random sequences of length ${RANDOM_SLICE_LENGTH} from entry ${accessionId} in ${database}...`,
    );

    // Get the full chromosome base pairs to use for generating random sequences
    const fullChromosomeBasePairs = await runBlastCommand(
      `blastdbcmd -db ${DATABASES_PATH}/${database} -entry ${accessionId}`,
    );
    const splitFullChromosomeBasePairs = _.split(fullChromosomeBasePairs, '\n');
    const fullChromosomeBasePairsFirstLine = splitFullChromosomeBasePairs[0];
    const fullChromosomeBasePairsWithoutFirstLine = splitFullChromosomeBasePairs.slice(1).join('');
    const RANDOM_CHUNK_SIZE = 1000;
    const timesToLoop = Math.ceil(numToGenerate / RANDOM_CHUNK_SIZE);
    let remainingNumberToGenerate = numToGenerate;
    console.time('Generating random sequences');
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(timesToLoop, 0);
    for (let i = 1; i <= timesToLoop; i++) {
      const currentNumToGenerate = Math.min(RANDOM_CHUNK_SIZE, remainingNumberToGenerate);
      remainingNumberToGenerate -= currentNumToGenerate;
      const generatedRandomStringPromises = _.times(currentNumToGenerate, () =>
        generateRandomString({
          maxLength: foundChromosome.length,
          fullChromosomeBasePairsFirstLine,
          fullChromosomeBasePairsWithoutFirstLine,
          randomSliceLength: RANDOM_SLICE_LENGTH,
        }),
      );
      const generatedRandomStrings = await Promise.all(generatedRandomStringPromises);
      fs.writeFileSync(randomFileName, generatedRandomStrings.join('\n') + '\n', { flag: 'a+' });
      progressBar.update(i);
    }
    progressBar.stop();
    console.timeEnd('Generating random sequences');
    console.log(`DONE generating ${numToGenerate} random sequences from entry ${accessionId} in ${database}.`);
    return { success: true };
  }
};
