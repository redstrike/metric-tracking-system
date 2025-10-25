use tracing_subscriber::{ filter::EnvFilter, layer::SubscriberExt, util::SubscriberInitExt };

pub fn initialize_tracing_subscriber(app_mode: &AppMode) {
	let subscriber = tracing_subscriber
		::registry()
		.with(
			EnvFilter::try_from_default_env().unwrap_or_else(|_|
				format!("tower_http=info,{}=info", env!("CARGO_CRATE_NAME")).into()
			)
		);

	if app_mode.is_development {
		subscriber.with(tracing_subscriber::fmt::layer()).init(); // Use the default formatting layer
		return;
	}

	// Use JSON formatting layer for structured logs in staging or production
	subscriber.with(tracing_subscriber::fmt::layer().json()).init();
}

use tower_http::{
	classify::{ ServerErrorsAsFailures, SharedClassifier },
	trace::{ DefaultMakeSpan, DefaultOnFailure, DefaultOnRequest, DefaultOnResponse, TraceLayer },
};
use tracing::Level;

use crate::config::AppMode;

type HttpTraceLayer = TraceLayer<
	SharedClassifier<ServerErrorsAsFailures>,
	DefaultMakeSpan,
	DefaultOnRequest,
	DefaultOnResponse,
	(),
	()
>;

pub fn create_http_trace_layer() -> HttpTraceLayer {
	TraceLayer::new_for_http()
		.make_span_with(
			DefaultMakeSpan::new().level(Level::INFO).include_headers(false) // 🔒 SECURITY: NEVER log request headers
		)
		// DISABLE BODY LOGGING (Critical Security Practice) - Explicitly suppress logging of request and response body data.
		.on_request(DefaultOnRequest::new().level(Level::DEBUG))
		.on_body_chunk(()) // 🔒 SECURITY: Ignore body chunks being read.
		.on_eos(()) // 🔒 SECURITY: Ignore end-of-stream (full body consumed).
		.on_response(
			DefaultOnResponse::new()
				.level(Level::INFO)
				.latency_unit(tower_http::LatencyUnit::Millis)
				.include_headers(false) // 🔒 SECURITY: NEVER log response headers
		)
		.on_failure(
			DefaultOnFailure::new()
				.level(Level::ERROR)
				.latency_unit(tower_http::LatencyUnit::Millis)
		)
}
