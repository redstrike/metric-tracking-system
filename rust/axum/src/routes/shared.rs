use serde::{ Deserialize, Serialize };
use serde_json::{ Value };
use serde_with::skip_serializing_none;

#[skip_serializing_none]
#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Response {
	pub success: bool,
	pub message: Option<String>,
	pub data: Option<Value>,
	pub error: Option<Value>,
}
