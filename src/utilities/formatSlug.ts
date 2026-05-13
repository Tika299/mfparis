export const formatSlug = (val: string): string =>
  val
    .toLowerCase()
    .normalize('NFD') // Tách các dấu ra khỏi chữ cái
    .replace(/[\u0300-\u036f]/g, '') // Xóa các dấu
    .replace(/[đĐ]/g, 'd') // Xóa chữ đ
    .replace(/([^0-9a-z-\s])/g, '') // Xóa ký tự đặc biệt
    .replace(/(\s+)/g, '-') // Thay khoảng trắng bằng gạch ngang
    .replace(/-+/g, '-') // Xóa các gạch ngang thừa
    .replace(/^-+|-+$/g, '') // Xóa gạch ngang ở đầu và cuối
