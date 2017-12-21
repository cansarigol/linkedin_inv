CREATE TABLE public.app_user
(
    cookie character varying(255) COLLATE pg_catalog."default",
    inote character varying COLLATE pg_catalog."default",
    token character varying(255) COLLATE pg_catalog."default",
    controllist character varying(255) COLLATE pg_catalog."default",
    id integer NOT NULL,
    keywords character varying(255) COLLATE pg_catalog."default",
    email character varying(255) COLLATE pg_catalog."default",
    is_active boolean,
    CONSTRAINT app_user_pkey PRIMARY KEY (id)
)
WITH (
    OIDS = FALSE
)