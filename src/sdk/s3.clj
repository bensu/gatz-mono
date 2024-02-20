(ns sdk.s3
  "Wrapper around AWS S3 SDK that can be used with Cloudflare's R2 as well"
  (:import [com.amazonaws.client.builder AwsClientBuilder$EndpointConfiguration]
           [com.amazonaws.services.s3 AmazonS3ClientBuilder]
           [com.amazonaws.auth BasicAWSCredentials AWSStaticCredentialsProvider]
           [com.amazonaws.services.s3.model GeneratePresignedUrlRequest]
           [java.util Date]))

(def EXPIRATION_IN_MINUTES 120)

(defn in-minutes [n]
  (Date. (+ (.getTime (Date.))
            (* 60 1000 n))))

(defn make-path [k]
  {:pre [(string? k)]}
  (let [asset-domain "https://gatzapi.com"]
    (format "%s/%s" asset-domain k)))

(defn presigned-url!
  "Makes an authenticated request to an S3 compatible services
   
  See https://docs.aws.amazon.com/AmazonS3/latest/userguide/RESTAuthentication.html
   "
  [{:keys [biff/secret] :as _ctx} id]

  {:pre [(string? id)]}

  (let [origin (secret :s3/origin)
        access-key (secret :s3/access-key)
        secret-key (secret :s3/secret-key)
        bucket (secret :s3/bucket)
        region (or (secret :s3/region) "us-east-1")  ;; dummy value that cloudflare doesn't need

        _ (assert (and origin access-key secret-key bucket)
                  "Missing S3 configuration")

        expiration-time (in-minutes EXPIRATION_IN_MINUTES)

        credentials (BasicAWSCredentials. access-key secret-key)
        endpoint (AwsClientBuilder$EndpointConfiguration. origin region)
        client (-> (AmazonS3ClientBuilder/standard)
                   (.withCredentials (AWSStaticCredentialsProvider. credentials))
                   (.withEndpointConfiguration endpoint)
                   (.enablePathStyleAccess)
                   (.build))
        req (doto (GeneratePresignedUrlRequest. bucket id)
              (.setMethod com.amazonaws.HttpMethod/PUT)
              (.setExpiration expiration-time))]
    (.generatePresignedUrl client req)))