FROM node:18-alpine

RUN apk add --no-cache git

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

# Skip build, use ts-node directly for dev
# RUN npx tsc 

ENV SESSION_ID=session_1
ENV DATA_DIR=./sessions
ENV LOG_LEVEL=info

VOLUME [ "/usr/src/app/data" ]

EXPOSE 3000

CMD [ "npx", "ts-node", "src/index.ts" ]
