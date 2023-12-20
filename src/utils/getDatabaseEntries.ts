import _ from 'lodash';
import { runBlastCommand } from './runBlastCommand';
import { DATABASES_PATH } from './constants';

export const getDatabaseEntries = async (database: string) => {
  const entries = await runBlastCommand(
    `blastdbcmd -db ${DATABASES_PATH}/${database} -entry all -outfmt "%a~separator~%l"`,
  );
  const entriesLines = _.compact(_.split(entries, '\n'));
  const chromosomesDataArray = _.map(entriesLines, line => {
    const [accessionId, lengthString] = _.split(line, '~separator~');
    return {
      accessionId,
      length: _.parseInt(lengthString, 10),
      // ordinalId,
    };
  });
  return chromosomesDataArray;
};
