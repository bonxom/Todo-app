FROM mongodb/mongodb-community-server:8.0-ubuntu2204

ENV MONGO_INITDB_ROOT_USERNAME=admin \
	MONGO_INITDB_ROOT_PASSWORD=adminpassword \
	MONGO_INITDB_DATABASE=todoapp

RUN mkdir -p /data/db /data/configdb

VOLUME ["/data/db", "/data/configdb"]

EXPOSE 27017

CMD ["mongod", "--bind_ip_all"]