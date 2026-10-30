import { BOOKING_URL, BRAND, EMAIL, HOTLINE } from '../config.js';
import Icon from './Icon.jsx';
import { Logo } from './Nav.jsx';

const TRIO = [
  ['shield', 'An toàn, riêng tư', 'Hình ảnh không được lưu lại'],
  ['chip', 'Công nghệ hiện đại', 'Nhận diện từng nốt mụn'],
  ['heart', 'Cá nhân hóa', 'Lời khuyên theo mức độ'],
];
const STEPS = [
  ['camera', '1. Chụp ảnh da mặt', 'Tải lên 1–3 ảnh chụp cận bằng điện thoại (mỗi ảnh một bên mặt), hoặc chụp bằng camera trên trình duyệt.'],
  ['face', '2. AI phân tích', 'Hệ thống khoanh và đếm từng nốt mụn trên mỗi ảnh rồi cộng tổng.'],
  ['doc', '3. Nhận kết quả & lời khuyên', 'Biết mức độ nhẹ, trung bình, nặng cùng gợi ý chăm sóc từ AI. Kết quả chỉ mang tính tham khảo.'],
  ['sparkle', '4. Gặp bác sĩ khi cần', 'Mụn nặng hoặc kéo dài, hãy đặt lịch để bác sĩ da liễu đánh giá kỹ hơn.'],
];
// Ảnh ở public/images/services/, pos = điểm lấy nét khi cắt khung 2:1
const SERVICES = [
  ['Khám và phân tích da mặt', 'Đánh giá tình trạng da, phát hiện vấn đề tiềm ẩn.', 'kham-da', '55% 30%'],
  ['Điều trị mụn', 'Phác đồ điều trị cá nhân hóa, hiệu quả và an toàn.', 'tri-mun', '50% 55%'],
  ['Trị nám, tàn nhang', 'Ứng dụng công nghệ hiện đại, hiệu quả bền vững.', 'tri-nam', '35% 40%'],
  ['Chống lão hóa', 'Cải thiện độ đàn hồi, trẻ hóa làn da.', 'chong-lao-hoa', '50% 42%'],
  ['Chăm sóc da nhạy cảm', 'Làm dịu, phục hồi hàng rào bảo vệ da.', 'da-nhay-cam', '55% 30%'],
];
const FAQ = [
  ['Hình ảnh của tôi có bị lưu lại không?', 'Không. Mỗi ảnh chỉ được gửi tới máy chủ để đếm nốt mụn rồi bỏ đi, hệ thống không lưu hình ảnh khuôn mặt.'],
  ['Kết quả có thay thế bác sĩ da liễu không?', 'Không. Đây là công cụ sàng lọc tham khảo. Nếu mụn nặng, viêm đau hoặc kéo dài, bạn nên đến gặp bác sĩ da liễu.'],
  ['Tôi dùng được trên điện thoại không?', 'Được. Mở trang bằng trình duyệt trên điện thoại, bấm “Chụp / chọn ảnh” để chụp bằng camera sau hoặc chọn ảnh có sẵn.'],
  ['Vì sao nên tải ảnh thay vì chụp bằng camera trên trình duyệt?', 'Ảnh chụp bằng ứng dụng camera của điện thoại có độ phân giải cao hơn nhiều so với webcam, nên AI nhìn rõ cả những nốt mụn nhỏ.'],
  ['Làm sao để kết quả chính xác hơn?', 'Chụp nơi ánh sáng tự nhiên, đều, để mặt mộc, tắt filter/làm đẹp, chụp cận để một bên mặt chiếm gần hết khung, mỗi ảnh một vùng mặt khác nhau và không chồng lên nhau.'],
];

export default function Home() {
  return (
    <>
      <header className="hero">
        <div className="hero-photo" aria-hidden="true" />
        <div className="wrap hero-in">
          <div className="hero-copy">
            <span className="pill">Thăm khám da mặt lâm sàng</span>
            <h1>Hiểu đúng làn da<br />Để chăm sóc đúng cách</h1>
            <p className="lead">Ứng dụng công nghệ AI nhận diện nốt mụn qua ảnh chụp hoặc camera, giúp bạn biết mức độ mụn của mình và nhận gợi ý chăm sóc phù hợp ngay trong vài giây.</p>
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
              {['Đếm nốt mụn tức thì', 'Đánh giá mức độ nhẹ – nặng', 'Gợi ý chăm sóc từ AI'].map((t) => (
                <li key={t}><Icon name="check" size={15} />{t}</li>
              ))}
            </ul>
          </aside>
        </div>
      </header>

      <section className="process" id="quy-trinh">
        <div className="wrap process-in">
          <div className="reveal">
            <span className="pill sm">Đơn giản – Nhanh chóng – Hiệu quả</span>
            <h2>Quy trình thăm khám &amp; tư vấn</h2>
            <p className="sub">Chỉ với vài bước đơn giản, bạn đã có thể hiểu rõ làn da của mình và nhận được lời khuyên hữu ích.</p>
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
            <p>Chọn thời gian phù hợp, chuyên gia sẽ liên hệ và hỗ trợ bạn trong thời gian sớm nhất.</p>
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
          <div className="band-lead"><span className="leafbox"><Icon name="leaf" size={26} /></span><div><b>Vì một làn da khỏe đẹp hơn</b><small>Chúng tôi luôn đồng hành cùng bạn.</small></div></div>
          {[['user', 'Cá nhân hóa', 'Lời khuyên theo từng mức độ'], ['chip', 'Công nghệ AI', 'Nhận diện từng nốt mụn'], ['shield', 'Bảo mật thông tin', 'Không lưu hình ảnh']].map(([i, t, d]) => (
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
