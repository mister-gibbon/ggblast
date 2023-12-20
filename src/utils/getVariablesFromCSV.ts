import _ from 'lodash';
import csvToJson from 'convert-csv-to-json';

type VariablesResult = {
  RANDOM_SLICE_LENGTH: number;
};

const unexposedJsonArray: Array<Record<string, string>> = [];

const getJsonArray = () => {
  if (!_.isEmpty(unexposedJsonArray)) {
    return unexposedJsonArray;
  }
  const newJsonArray: Array<Record<string, string>> = csvToJson.fieldDelimiter(',').getJsonFromCsv('_variables.csv');
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

let variablesResult: VariablesResult | undefined = undefined;

export const getVariablesFromCSV = (): VariablesResult => {
  if (variablesResult) {
    return variablesResult;
  }
  const rawVariablesResult = getJsonArray()[0];
  const variablesResultWithUpperKeys = _.mapKeys(rawVariablesResult, (_value, key) => _.toUpper(_.snakeCase(key)));
  const variablesResultWithParsedNumbers = _.mapValues(variablesResultWithUpperKeys, value => {
    const numberValue = Number(value);
    if (_.isNaN(numberValue)) {
      return value;
    }
    if (numberValue.toString() !== value.trim()) {
      return value;
    }
    return numberValue;
  });
  variablesResult = variablesResultWithParsedNumbers as VariablesResult;
  return variablesResult;
};
