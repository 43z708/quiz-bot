FROM node:16
  

RUN apt update &\
npm install -g npm &\
npm install -g firebase-tools &\
mkdir -p /mnt/src

WORKDIR /mnt/src

# CMD  npm run local-serve