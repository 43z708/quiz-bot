FROM node:16
  
WORKDIR /mnt/src

RUN apt-get update &\
npm install -g npm &\
npm install -g firebase-tools &\
mkdir .tmp


CMD  npm run start