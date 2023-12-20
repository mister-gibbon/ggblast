# Gutsick Gibbon Blast Tool

## Setup

1. Download a release and extract it
2. Download a blast zip (make sure you don't get the src zip, double check the bullets below to verify) using
   [this link](https://ftp.ncbi.nlm.nih.gov/blast/executables/blast+/LATEST/) and extract it, then move the files from
   `bin` into the `installed_blast` folder
   - The zip file you downloaded should be named `ncbi-blast-X.XX.X+-win64.zip` or `nbci-blast-X.XX.X+-macosx.tar.gz`
     depending on your platform
   - `blastn` (or `blastn.exe` on windows) should be alongside `_put_extracted_blast_installation_here.txt`
   - This was tested on [blast 2.13.0](https://ftp.ncbi.nlm.nih.gov/blast/executables/blast+/2.13.0/), later versions
     may have errors, but try them first before swapping
3. Download at least 2 FASTA (.fa) genome files and put them in the `fasta_files` folder
   - The .fa files should be alongside `_put_fasta_files_here.txt`
   - If you are unsure where to get fasta files, you can use [ensembl](https://ensembl.org/index.html)

## Usage

1. Open a terminal or cmd window and use `cd` to move to the extracted release folder
   - For example, if your downloaded folder is in `C:\Users\YourName\GutsickGibbonBlastTool-0.1`, then run
     `cd C:\Users\YourName\GutsickGibbonBlastTool-0.1`
2. Run the executable: `ggblast` or `ggblast.exe` on windows
   - If you get a permissions error:
     - On mac
       - Reveal the script in your finder
       - Right-click and select open
       - Click the open button in the popup
       - Close the window that opens
       - Retry from your terminal
     - On linux
       - Run `chmod +x ggblast`
       - Retry from your terminal

## Configuration

- TODO: Explain updating \_config.csv
- TODO: Explain updating \_variables.csv

## Running from src

1. Clone this repo
2. Follow the setup instructions
3. `yarn install`
4. `yarn start`
   - or `yarn package` to create the executable then `packages/ggblast-PLATFORM`
