import path from 'path';
import { BLAST_INSTALL_PATH } from './constants';
import { execPromise } from './execPromise';

export const runBlastCommand = (command: string): Promise<string> => {
  const splitCommand = command.split(' ');
  const executable = splitCommand[0];
  const rest = splitCommand.slice(1).join(' ');
  return execPromise(`${path.join(BLAST_INSTALL_PATH, executable)} ${rest}`);
};
