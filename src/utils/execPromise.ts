import child from 'child_process';

const MAX_BUFFER_SIZE = 1024 * 1000 * 1000; // 1000MB

export const execPromise = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    child.exec(command, { maxBuffer: MAX_BUFFER_SIZE }, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }
      resolve(stdout);
    });
  });
};
