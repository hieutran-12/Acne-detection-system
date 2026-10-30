import { BOOKING_URL, BRAND, EMAIL, HOTLINE } from '../config.js';
import Icon from './Icon.jsx';
import { Logo } from './Nav.jsx';

const TRIO = [
  ['shield', 'Riêng tư', 'Hình ảnh không được lưu lại'],
  ['chip', 'Đếm từng nốt', 'Khoanh từng nốt mụn trên ảnh'],
  ['heart', 'Lời khuyên riêng', 'Tuỳ theo mức độ mụn của bạn'],
];
const STEPS = [
  ['camera', '1. Chụp ảnh da mặt', 'Tải lên 1 đến 3 ảnh chụp cận bằng điện thoại, mỗi ảnh một bên mặt. Chụp ngay trên trình duyệt cũng được.'],
  ['face', '2. AI đếm mụn', 'Hệ thống khoanh từng nốt mụn trên mỗi ảnh rồi cộng lại.'],
  ['doc', '3. Xem kết quả', 'Bạn biết mụn đang ở mức nhẹ, trung bình hay nặng và nên chăm sóc thế nào. Kết quả chỉ mang tính tham khảo.'],
  ['sparkle', '4. Gặp bác sĩ khi cần', 'Mụn nặng hoặc lâu khỏi thì nên đặt lịch để bác sĩ da liễu xem trực tiếp.'],
];
// Ảnh ở public/images/services/, pos = điểm lấy nét khi cắt khung 2:1
const SERVICES = [
  ['Khám và phân tích da mặt', 'Bác sĩ xem da đang có vấn đề gì trước khi điều trị.', 'kham-da', '55% 30%'],
  ['Điều trị mụn', 'Phác đồ tuỳ theo tình trạng da của từng người.', 'tri-mun', '50% 55%'],
  ['Trị nám, tàn nhang', 'Điều trị theo loại nám và nền da của bạn.', 'tri-nam', '35% 40%'],
  ['Chống lão hóa', 'Giúp da săn chắc và đàn hồi hơn.', 'chong-lao-hoa', '50% 42%'],
  ['Chăm sóc da nhạy cảm', 'Làm dịu da kích ứng, phục hồi da yếu.', 'da-nhay-cam', '55% 30%'],
];
const FAQ = [
  ['Hình ảnh của tôi có bị lưu lại không?', 'Không. Mỗi ảnh chỉ được gửi tới máy chủ để đếm nốt mụn rồi bỏ đi, hệ thống không lưu hình ảnh khuôn mặt.'],
  ['Kết quả có thay thế bác sĩ da liễu không?', 'Không. Đây là công cụ sàng lọc tham khảo. Nếu mụn nặng, viêm đau hoặc kéo dài, bạn nên đến gặp bác sĩ da liễu.'],
  ['Tôi dùng được trên điện thoại không?', 'Được. Mở trang bằng trình duyệt trên điện thoại rồi bấm “Chụp / chọn ảnh” để chụp mới hoặc chọn ảnh có sẵn.'],
  ['Vì sao nên tải ảnh thay vì chụp bằng camera trên trình duyệt?', 'Ảnh từ app camera của điện thoại nét hơn webcam nhiều, nên AI thấy được cả những nốt mụn nhỏ.'],
  ['Làm sao để kết quả chính xác hơn?', 'Chụp chỗ có ánh sáng tự nhiên, để mặt mộc và tắt filter. Đưa máy lại gần để một bên mặt chiếm gần hết khung, mỗi ảnh một vùng, đừng chồng lên nhau.'],
];

export default function Home() {
  return (
    <>
      <header className="hero">
        <div className="hero-photo" aria-hidden="true" />
        <div className="wrap hero-in">
          <div className="hero-copy">
            <span className="pill">Đếm mụn qua ảnh chụp</span>
            <h1>Mụn nhiều hay ít?<br />Chụp ảnh là biết</h1>
            <p className="lead">Chụp ảnh da mặt hoặc tải ảnh có sẵn lên, AI sẽ đếm số nốt mụn, cho biết mức độ và gợi ý cách chăm sóc. Chỉ mất vài giây.</p>
            <ul className="trio">
              {TRIO.map(([i, t, d]) => (
                <li key={t}><span className="ico"><Icon name={i} /></span><div><b>{t}</b><small>{d}</small></div></li>
              ))}
            </ul>
            <div className="cta">
              <a className="btn primary lg" href="#/kham">Thăm khám AI ngay <Icon name="arrow" size={18} /></a>
              <a className="btn outline lg" href={BOOKING_URL}><Icon name="calendar" size={18} />Đặt lịch tư vấn</a>
            </div>
          </div>
          <aside className="float-card" aria-hidden="true">
            <div className="skin" />
            <ul>
              {['Đếm nốt mụn trong vài giây', 'Xếp mức nhẹ, trung bình, nặng', 'Gợi ý cách chăm sóc'].map((t) => (
                <li key={t}><Icon name="check" size={15} />{t}</li>
              ))}
            </ul>
          </aside>
        </div>
      </header>

      <section className="process" id="quy-trinh">
        <div className="wrap process-in">
          <div className="reveal">
            <span className="pill sm">Làm trong 4 bước</span>
            <h2>Quy trình thăm khám &amp; tư vấn</h2>
            <p className="sub">Từ lúc chụp ảnh đến lúc có kết quả chỉ mất vài phút.</p>
            <ol className="steps4">
              {STEPS.map(([i, t, d]) => (
                <li key={t}><span className="ico lg"><Icon name={i} size={26} /></span><h3>{t}</h3><p>{d}</p></li>
              ))}
            </ol>
          </div>
          <div className="book reveal">
            <div className="book-img" />
            <span className="pill xs">Tư vấn trực tuyến hoặc trực tiếp</span>
            <h3>Đặt lịch tư vấn ngay</h3>
            <p>Chọn giờ bạn rảnh, bên mình sẽ gọi lại để xác nhận.</p>
            <a className="btn primary" href={BOOKING_URL}><Icon name="calendar" size={18} />Đặt lịch ngay <Icon name="arrow" size={16} /></a>
          </div>
        </div>
      </section>

      <section className="services" id="dich-vu">
        <div className="wrap">
          <div className="sec-head reveal">
            <div><span className="pill sm">Dịch vụ nổi bật</span><h2>Các dịch vụ thăm khám &amp; tư vấn</h2></div>
            <a href="#/lien-he" className="more">Xem tất cả dịch vụ <Icon name="arrow" size={14} /></a>
          </div>
          <div className="cards">
            {SERVICES.map(([t, d, img, pos], i) => (
              <article key={t} className="svc reveal" style={{ transitionDelay: `${i * 70}ms` }}>
                <div className="svc-img" style={{ backgroundImage: `url(/images/services/${img}.jpg)`, backgroundPosition: pos }} />
                <div className="svc-body">
                  <h3>{t}</h3><p>{d}</p>
                  <a href="#/lien-he">Tìm hiểu thêm <Icon name="arrow" size={14} /></a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="faq" id="cau-hoi">
        <div className="wrap faq-in">
          <div className="reveal"><span className="pill sm">Giải đáp</span><h2>Câu hỏi thường gặp</h2></div>
          <div className="reveal">
            {FAQ.map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap band-in">
          <div className="band-lead"><span className="leafbox"><Icon name="leaf" size={26} /></span><div><b>Còn băn khoăn về da?</b><small>Cứ đặt lịch, bác sĩ sẽ tư vấn cho bạn.</small></div></div>
          {[['user', 'Lời khuyên riêng', 'Tuỳ theo mức độ mụn'], ['chip', 'Đếm bằng AI', 'Khoanh từng nốt mụn'], ['shield', 'Riêng tư', 'Không lưu hình ảnh']].map(([i, t, d]) => (
            <div key={t} className="band-item"><span className="ico dark"><Icon name={i} /></span><div><b>{t}</b><small>{d}</small></div></div>
          ))}
          <a className="btn light" href={BOOKING_URL}>Đặt lịch tư vấn <Icon name="arrow" size={16} /></a>
        </div>
      </section>

      <footer className="foot" id="lien-he">
        <div className="wrap foot-in">
          <Logo light />
          <div className="contact">
            <b>Liên hệ {BRAND}</b>
            {HOTLINE && <a href={`tel:${HOTLINE.replace(/\s/g, '')}`}>Hotline: {HOTLINE}</a>}
            {EMAIL && <a href={`mailto:${EMAIL}`}>{EMAIL}</a>}
            {!HOTLINE && !EMAIL && <span>Vui lòng liên hệ {BRAND} để đặt lịch tư vấn.</span>}
          </div>
          <p>AcneScope là công cụ hỗ trợ tham khảo, không thay thế chẩn đoán và điều trị của bác sĩ da liễu.<br /><small>© 2026 {BRAND}. Bảo lưu mọi quyền.</small></p>
        </div>
      </footer>
    </>
  );
}
