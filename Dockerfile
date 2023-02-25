FROM node:16
  

RUN apt-get update &\
npm install -g npm &\
npm install -g firebase-tools &\
mkdir -p /mnt/src/.tmp

WORKDIR /mnt/src

CMD  npm run start