import _ from 'lodash';
import csvToJson from 'convert-csv-to-json';

const unexposedJsonArray: Array<Record<string, string>> = [];

const getJsonArray = () => {
  if (!_.isEmpty(unexposedJsonArray)) {
    return unexposedJsonArray;
  }
  const newJsonArray: Array<Record<string, string>> = csvToJson.fieldDelimiter(',').getJsonFromCsv('_config.csv');
  _.forEach(newJsonArray, row => {
    const rowWithFixedKeys = _.mapKeys(row, (_value, key) => _.camelCase(key));
    const rowWithFixedQuotes = _.mapValues(rowWithFixedKeys, value => {
      return _(value)
        .replace(/^"/gm, '') // Remove leading double quotes
        .replace(/"$/gm, '') // Remove trailing double quotes
        .replace(/""/g, '"') // Replace "" with "
        .valueOf();
    });
    unexposedJsonArray.push(rowWithFixedQuotes);
  });
  return unexposedJsonArray;
};

const methodParamsMap: Record<string, string> = {};

export const getMethodParamsMap = (): Record<string, string> => {
  if (!_.isEmpty(methodParamsMap)) {
    return methodParamsMap;
  }
  const jsonArray = getJsonArray();
  _.forEach(jsonArray, row => {
    methodParamsMap[row['name']] = row['params'];
  });
  return methodParamsMap;
};

const methodPromptChoices: Array<{ value: string; title: string; description: string }> = [];

export const getMethodPromptChoices = () => {
  if (!_.isEmpty(methodPromptChoices)) {
    return methodPromptChoices;
  }
  const jsonArray = getJsonArray();
  _.forEach(jsonArray, row => {
    methodPromptChoices.push({
      value: row['name'],
      title: row['title'],
      description: row['params'],
    });
  });
  return methodPromptChoices;
};
