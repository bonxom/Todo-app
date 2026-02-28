FROM node:22-alpine

WORKDIR /app
# Tận dụng cache, chỉ copy package.json trước để cài dependencies
# Điều này giúp tránh việc cài lại dependencies nếu chỉ có code thay đổi
COPY package*.json ./ 

# Cài đặt dependencies
# npm ci (clean install) sẽ đảm bảo cài đúng phiên bản được chỉ định trong package-lock.json
# npm install có thể dẫn đến việc cài phiên bản mới hơn nếu package-lock.json không được cập nhật
RUN npm ci 

# Copy toàn bộ mã nguồn vào container
COPY . .

EXPOSE 4000

CMD ["npm", "run", "start"]