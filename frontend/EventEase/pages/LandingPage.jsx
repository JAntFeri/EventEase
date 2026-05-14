import React from 'react';
// Note: Ensure you have bootstrap CSS in your project
// import 'bootstrap/dist/css/bootstrap.min.css';

const EventEaseLanding = () => {
  return (
    <div className="bg-light min-vh-100">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top shadow-sm">
        <div className="container">
          <a className="navbar-brand fw-bold" href="#">
            <i className="bi bi-calendar-check-fill me-2"></i>EventEase
          </a>
          <div className="d-none d-md-block">
            <button className="btn btn-outline-light rounded-pill px-4">Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="py-5 bg-white border-bottom">
        <div className="container py-5 text-center">
          <h1 className="display-4 fw-bold text-dark mb-3">Event Planning, Simplified.</h1>
          <p className="lead text-secondary mb-4 mx-auto" style={{ maxWidth: '700px' }}>
            The all-in-one platform for student organizations, small businesses, and volunteers to coordinate meetings, conferences, and trips.
          </p>
          <div className="d-grid gap-3 d-sm-flex justify-content-sm-center">
            <button className="btn btn-primary btn-lg px-5 fw-bold shadow">Create Event</button>
            <button className="btn btn-outline-secondary btn-lg px-5">Learn More</button>
          </div>
        </div>
      </header>

      {/* Core Features */}
      <section className="container py-5">
        <div className="row g-4 py-5">
          <div className="col-md-4">
            <div className="card h-100 border-0 shadow-sm p-3">
              <div className="card-body">
                <div className="mb-3 text-primary"><i className="bi bi-people-fill fs-1"></i></div>
                <h3 className="h5 fw-bold">Group Polls</h3>
                <p className="text-muted small">Can't decide on a date? Let participants vote on the best time slot.</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100 border-0 shadow-sm p-3">
              <div className="card-body">
                <div className="mb-3 text-primary"><i className="bi bi-calendar-event fs-1"></i></div>
                <h3 className="h5 fw-bold">Auto-Sync</h3>
                <p className="text-muted small">Once a date is chosen, it is automatically written to your calendar.</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100 border-0 shadow-sm p-3">
              <div className="card-body">
                <div className="mb-3 text-primary"><i className="bi bi-bell-fill fs-1"></i></div>
                <h3 className="h5 fw-bold">Instant Notifications</h3>
                <p className="text-muted small">Automatic emails and notifications for all event participants.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section (Reflecting User_flow.drawio) */}
      <section className="bg-white py-5 border-top border-bottom">
        <div className="container">
          <h2 className="text-center fw-bold mb-5">How It Works</h2>
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <ul className="list-group list-group-flush">
                <li className="list-group-item py-4 d-flex">
                  <span className="badge bg-primary rounded-circle me-3 mt-1" style={{ width: '30px', height: '30px' }}>1</span>
                  <div>
                    <h5 className="fw-bold">Start at Dashboard</h5>
                    <p className="mb-0 text-muted">Create a new event and enter basic details like title and description[cite: 2, 5].</p>
                  </div>
                </li>
                <li className="list-group-item py-4 d-flex">
                  <span className="badge bg-primary rounded-circle me-3 mt-1" style={{ width: '30px', height: '30px' }}>2</span>
                  <div>
                    <h5 className="fw-bold">Invite & Assign</h5>
                    <p className="mb-0 text-muted">Invite participants. If they are organizers, they automatically receive editing rights[cite: 25, 32].</p>
                  </div>
                </li>
                <li className="list-group-item py-4 d-flex">
                  <span className="badge bg-primary rounded-circle me-3 mt-1" style={{ width: '30px', height: '30px' }}>3</span>
                  <div>
                    <h5 className="fw-bold">Schedule Your Way</h5>
                    <p className="mb-0 text-muted">If the date is unknown, launch a <strong>Group Poll</strong>. Otherwise, pick a date on the calendar[cite: 10, 14].</p>
                  </div>
                </li>
                <li className="list-group-item py-4 d-flex">
                  <span className="badge bg-primary rounded-circle me-3 mt-1" style={{ width: '30px', height: '30px' }}>4</span>
                  <div>
                    <h5 className="fw-bold">Finalize & Notify</h5>
                    <p className="mb-0 text-muted">The system saves the entry to the calendar and sends out automated notifications[cite: 18, 20].</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-5 bg-dark text-white">
        <div className="container text-center">
          <p className="mb-0 opacity-75">© 2026 EventEase. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default EventEaseLanding;