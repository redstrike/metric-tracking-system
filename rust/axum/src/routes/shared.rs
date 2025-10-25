use axum::{ http, Json };
use serde::{ Deserialize, Serialize };
use serde_json::Value;
use serde_with::skip_serializing_none;

#[skip_serializing_none]
#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Response<OkType, ErrType> {
	pub success: bool,
	pub message: Option<String>,
	pub data: Option<OkType>,
	pub error: Option<ErrType>,
}

type OkResponse<T> = Json<Response<T, ()>>;
type ErrResponse = Json<Response<(), Option<Value>>>;
pub type HandlerResult<T> = Result<OkResponse<T>, (http::StatusCode, ErrResponse)>;
