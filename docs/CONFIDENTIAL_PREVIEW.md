# Confidential preview

The public JEV Trading view combines current market observations and linked social posts with a separate **Preview Beta** activity journal. Confidential identities and their action paths are illustrative product activity. They are not live orders, market returns, or concealed customer trades.

The journal has one server-owned clock and seven time-spread events per 30-second active cycle. A position retains its identity, chain, action path and current multiplier. At most ten positions are open. The viewport retains 100 positions; the durable event history is not trimmed to that display limit.

TP1 through TP5 correspond to 2× through 6× respectively. BUY starts a preview position; HOLD and MOONBAG continue it; closing actions keep the final value. SKIP does not create an open position. No signing keys, wallet calls, order submission, or real-token performance tracking are connected to this journal.

The gateway serves `GET /__jev/trading?after=<sequence>` as a bounded, read-only projection. The producer persists its state and random cursor transactionally with its events on the core's persistent volume. Restart resumes the saved active clock without inventing events for offline time. Browser reconnection restores the latest state instead of replaying old BUY actions.

The original local journal was imported before public activation. Its initial sequence was 3,176, covering 1,770 positions and nine open cases. This records presentation continuity, not execution history.

The scene sends each new activity label through a small visual relay to the journal below the brain. Paused or background views retain their state and resume from current data. Reduced motion omits the moving orb.

Validation covers restart continuity, transaction rollback, the 100-position display limit, ten-open-position limit, chain identity, action transitions, TP values, bounded HTTP cursors, browser recovery and independent live-data presentation pacing.
