import { execPromise } from '../utils/execPromise';

const buildAndPackage = async () => {
  await execPromise('yarn build');
  await execPromise('yarn pkg ./dist --out-path ./packages');
};

buildAndPackage();
