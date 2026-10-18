# Orbit MCP phase 1 — Bảo toàn phân quyền khi lọc task

Ngày: 2026-10-16. Trạng thái: đã triển khai và nghiệm thu ngày 2026-10-16; xem nhật ký trong implementation plan.

[Roadmap](../plans/2026-10-16-orbit-mcp-roadmap.md) · [Implementation plan](../plans/2026-10-16-orbit-mcp-phase-1.md)

## Mục tiêu

Mọi bộ lọc của `taskService.getAll(user, queryParams)` chỉ được thu hẹp tập task mà user có quyền truy cập. Điều này áp dụng đồng thời cho dữ liệu và `pageInfo.totalCount`, tạo nền tảng để REST và MCP dùng chung service an toàn.

## Hiện trạng đã kiểm tra

- Task không có `userId`. `buildTaskAccessQuery` lấy category/project của user để xây quyền đọc.
- User có cả category và project: query quyền là `$or` giữa hai nhóm. `getAll` hiện gán `query.$or` khi search, làm mất ràng buộc quyền đó.
- User chỉ có project: query quyền là `projectId: {$in: [...]}`. Filter `projectId` hiện gán đè trường này, có thể chuyển sang project của người khác hoặc mọi task standalone.
- User không có category/project được giới hạn bằng `{_id: {$in: []}}`.
- Admin có query quyền `{}`; đây là hành vi hiện tại cần giữ trong REST.
- `taskRepository.findPaginated` dùng cùng query cho `find` và `countDocuments`.
- Test service hiện có tập trung vào lifecycle và một số endpoint phân trang; chưa có test `getAll` cho hai lỗi ghi đè trên.

Các nhận xét trên mô tả trạng thái trước sửa. Khi triển khai, ba unit test đã tái hiện lỗi; sau sửa, 7 integration test trên MongoDB disposable đã pass. Không thử nghiệm trên dữ liệu production.

## Phạm vi

Sửa cách ghép query trong `getAll`; thêm test hồi quy unit và integration MongoDB riêng biệt. Giữ nguyên route, controller, schema API và phương thức repository.

Không thêm SDK/endpoint MCP, dependency runtime, field `userId`, migration dữ liệu, cơ chế OAuth, thay đổi stats hoặc quy tắc ngày giờ. Không refactor các service ngoài phạm vi lỗi này.

## Hợp đồng quyền và bộ lọc

Với user thường:

```text
Access(user) = category thuộc user OR project thuộc user
Result(user, filters) = Access(user) AND Filters(filters)
```

Quyền ở đây giữ nguyên quy tắc OR hiện có; không đổi thành “cả category lẫn project đều phải thuộc user”. Task có tham chiếu lịch sử khác chủ sở hữu vẫn theo quy tắc này. Sự khác nhau với `getById` (ưu tiên category owner) cần rà soát riêng trước khi mở MCP; phase 1 không tuyên bố đã thống nhất toàn bộ authorization.

| Đầu vào                                                 | Hành vi bắt buộc                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Không filter                                            | Trả đúng tập theo quyền hiện tại                                                 |
| `search`                                                | Trim, tìm title hoặc description, không phân biệt hoa thường, escape ký tự regex |
| Search rỗng/toàn khoảng trắng                           | Không thêm điều kiện search                                                      |
| `status`                                                | AND với quyền và các filter khác                                                 |
| `projectId` cụ thể                                      | AND với quyền, không thay danh sách project được phép                            |
| `projectId=standalone`                                  | Chỉ task có project null/missing theo MongoDB và vẫn thuộc quyền                 |
| `startDate` + `endDate`                                 | Khoảng inclusive `$gte/$lte` trên `dueDate`, giữ validation hiện có              |
| Khoảng ngày thiếu một đầu, sai định dạng hoặc đảo ngược | `COMMON_ERROR.INVALID_PAYLOAD`, không gọi repository phân trang                  |
| Không có category/project                               | `data=[]`, `totalCount=0` với mọi filter hợp lệ                                  |
| Admin                                                   | Quyền không hạn chế, nhưng filter vẫn được áp dụng                               |

Chỉ xét filter đã qua validation đối với REST; phase 2 có trách nhiệm validation tương đương trước khi gọi service từ MCP. Không thêm contract mới cho giá trị query tùy ý trong phase 1.

## Thiết kế

Tách `accessQuery` khỏi `filters` ngay trong `getAll`. Search OR nằm trong `filters`; ngày, status, project cùng nằm trong object này. Chỉ ghép ở cuối:

```typescript
const query: Record<string, unknown> =
  Object.keys(filters).length === 0
    ? accessQuery
    : { $and: [accessQuery, filters] };
```

Không merge/spread filter vào query quyền. Không lọc quyền sau khi lấy dữ liệu hoặc sau pagination. Repository tiếp tục nhận một query duy nhất cho cả dữ liệu và count.

Đây là thay đổi nhỏ trong file hiện hữu; chưa cần tạo generic query builder. Giữ chữ ký:

```typescript
getAll(
  user: IUserDocument,
  queryParams: Record<string, unknown>,
): Promise<ResponsePage<ITaskDocument>>
```

Giữ `pageNo=1`, `pageSize=20`, giới hạn HTTP hiện có là 100; giữ cách parse sort, default sort `{dueDate: 1, createdAt: -1}`, cách populate và response `{pageInfo, data}`.

## Ma trận nghiệm thu

| ID  | Kịch bản                                                                   | Kết quả                                                  |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| A1  | A có category + project, A/B có task cùng từ khóa                          | Search chỉ trả task trong quyền A                        |
| A2  | User chỉ có project, lọc project của B                                     | Không có dữ liệu và count bằng 0                         |
| A3  | User chỉ có project, lọc standalone                                        | Không có dữ liệu và count bằng 0                         |
| A4  | User chỉ có category; user không có cả hai                                 | Tương ứng chỉ task category của user; hoặc tập rỗng      |
| A5  | Task chỉ gắn project của A, không có category                              | A vẫn đọc được theo quyền project                        |
| A6  | Search + status + project + khoảng ngày                                    | Áp dụng giao của toàn bộ điều kiện và quyền              |
| A7  | Search literal `a+b`, khác hoa thường, chỉ trúng description; search trắng | Không mở rộng regex; tìm đúng field; trắng không lọc     |
| A8  | Admin có/không filter                                                      | Đọc xuyên user theo chính sách hiện tại; filter vẫn đúng |
| A9  | Không filter; trang 2 kích thước 1, sort title                             | Giữ shape và paging; count chỉ tính các task hợp lệ      |
| A10 | Ngày thiếu/sai/đảo                                                         | Lỗi domain hiện có; repository không được gọi            |

Unit test kiểm tra ranh giới hai nhóm query và paging options. Integration test chạy query thật trên MongoDB disposable với fixture A/B, xác minh task IDs và count; không dùng mock trả sẵn dữ liệu để tuyên bố đã chứng minh cách ly người dùng.

## Điều kiện hoàn thành và vận hành

- A1–A10 có test theo mapping trong plan, test hồi quy tái hiện lỗi trước bản sửa.
- Backend typecheck và toàn bộ test pass; MongoDB integration phải chạy thực, không chỉ báo skipped.
- Chạy kiểm tra frontend theo quy ước repo để xác nhận không có lỗi nền bị bỏ sót; không sửa lỗi ngoài phạm vi trong PR này.
- Không đổi API hoặc schema, không cần migration/backfill. Bản sửa deploy theo backend thông thường.
- Nếu có regression, sửa tiếp hoặc tạm tắt đường truy cập bị ảnh hưởng; rollback nguyên bản sửa sẽ khôi phục lỗi phân quyền và không phải biện pháp an toàn mặc định.
- Phase 1 chỉ xác nhận phạm vi `getAll`, không phải audit toàn hệ thống hoặc chứng nhận sẵn sàng public MCP.

## Ràng buộc chung

- Dùng pnpm trong từng package; không tạo root workspace hoặc package-lock.json.
- Giữ TypeScript strict và import tương đối với đuôi `.js`.
- Không thêm dependency runtime hoặc thay đổi schema MongoDB.
- Không đọc/ghi dữ liệu production trong test; integration dùng MongoDB disposable riêng.
- Không sửa `.env` thực hoặc log token/secret.
