FROM node:argon
EXPOSE 2255

RUN mkdir /app
WORKDIR /app
ADD package.json /app
RUN npm install
ADD . /app

CMD npm start
