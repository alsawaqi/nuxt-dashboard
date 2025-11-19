FROM node:20

WORKDIR /app

# copy package files
COPY ./nuxt-app/package*.json ./

# install deps (optional in dev, but ok)
RUN npm install

# copy source
COPY ./nuxt-app .

# default command (compose will override anyway)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
