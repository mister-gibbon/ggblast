#!/usr/bin/python
"""
	seq_split.py
	Creators :     Jeff Tomkins and Daryl Robbins
	Create date :  Aug 22, 2012 
	Last modified: 9-13-13 (JP Tomkins)
	Description :  This program takes a chromosome sequence "fasta" formatted text input file (1st arg) and creates a
	               reparsed fasta file of sequence substrings of specified length (2nd arg) - each with it's own unique
	               header line.
	Modifications since original: Added regex and re.compile code for removal of non DNA chars (Tomkins)
								  Added outfile naming to include seq slice size and splitting identifier (Tomkins)

"""
import sys
import re

args = sys.argv[1:]
regex = re.compile(" |>.*$|\d|\t|\n|N|n")

if len(args) != 2:
    print("Error!  Two arguments needed: input file name and desired sequence length.")
    sys.exit()

inFileName = args[0]
seqLength = int(args[1])
seq = ""

# Open files for read/write
fi = open(inFileName, "r")
fo = open(inFileName + "_split_" + str(seqLength) + ".fa", "w")

# For each line in input file do regex removal
for line in fi:
    seq += regex.sub("", line)

# Parse the new fasta file
for i in range(0, len(seq), seqLength):
    # print the starting character and add the character count number for each sequence substring
    outLine = ">" + str(i) + "\n"
    fo.write(outLine)
    # get the substring of specified length
    outSeq = seq[i : i + seqLength]
    # take that substring and break it up into lines of 70 characters for output
    for j in range(0, len(outSeq), 70):
        outLine = outSeq[j : j + 70] + "\n"
        fo.write(outLine)

# Close files and exit
fi.close()
fo.close()
