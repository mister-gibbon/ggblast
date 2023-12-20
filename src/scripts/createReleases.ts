import { execPromise } from '../utils/execPromise';
import packageJson from '../../package.json';

const RELEASE_PREFIX = 'ggblast';

const createRelease = async () => {
  const platforms = ['linux', 'macos', 'win'];

  console.log('Running yarn package...');
  await execPromise('yarn package');

  console.log('Removing releases folder if it exists...');
  await execPromise('rm -rf releases');

  console.log('Creating releases folder...');
  await execPromise('mkdir releases');

  for (const platform of platforms) {
    console.log(`Creating release folder for ${platform}...`);
    await execPromise(`mkdir releases/${platform}`);

    console.log(`Copying _config.csv to the release folder for ${platform}...`);
    await execPromise(`cp _config.csv releases/${platform}`);

    console.log(`Copying _variables.csv to the release folder for ${platform}...`);
    await execPromise(`cp _variables.csv releases/${platform}`);

    console.log(`Copying _put_fasta_files_here.txt to the release folder for ${platform}...`);
    await execPromise(`mkdir releases/${platform}/fasta_files`);
    await execPromise(`cp fasta_files/_put_fasta_files_here.txt releases/${platform}/fasta_files`);

    console.log(`Copying _put_extracted_blast_installation_bin_here.txt to the release folder for ${platform}...`);
    await execPromise(`mkdir releases/${platform}/installed_blast`);
    await execPromise(
      `cp installed_blast/_put_extracted_blast_installation_bin_here.txt releases/${platform}/installed_blast`,
    );

    console.log(`Copying executable to the release folder for ${platform}...`);
    await execPromise(
      `cp packages/${RELEASE_PREFIX}-${
        platform === 'win' ? platform + '.exe' : platform
      } releases/${platform}/${RELEASE_PREFIX}${platform === 'win' ? '.exe' : ''}`,
    );

    console.log(`Copying README.md to the release folder for ${platform}...`);
    await execPromise(`cp README.md releases/${platform}`);

    console.log(`Zipping the release folder for ${platform}...`);
    const zipFileName = `${RELEASE_PREFIX}-${platform}-${packageJson.version}`;
    await execPromise(
      `cd releases && mv ${platform} ${zipFileName} && zip -r ${zipFileName}.zip ${zipFileName} && cd ..`,
    );

    console.log(`Removing the release folder for ${platform}...`);
    await execPromise(`rm -rf releases/${zipFileName}`);
  }
};

createRelease();
