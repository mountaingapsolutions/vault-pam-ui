#!/usr/bin/env bash
#

readonly APP_NAME=vault-pam-ui
readonly CURRENT_SCRIPT="$(basename -- ${BASH_SOURCE[0]})"
readonly CURRENT_DIRECTORY="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly ENV_VARS=(PAM_DATABASE
                  PAM_DATABASE_USER
                  PAM_DATABASE_PASSWORD
                  PAM_DATABASE_URL
                  PAM_DATABASE_PORT
                  VAULT_API_TOKEN
                  VAULT_DOMAIN
                  PAM_MAIL_SERVICE
                  PAM_MAIL_USER
                  PAM_MAIL_PASS)
# styles
NL=$'\n'
BOLD=$(tput bold)
NORMAL=$(tput sgr0)

print_raw() {
    printf "$*$NL"
}

show_grey () {
    echo -e $BOLD$(tput setaf 7) $@ $NORMAL
}

show_norm () {
    echo -e $BOLD$(tput setaf 15) $@ $NORMAL
}

show_info () {
    echo -e $BOLD$(tput setaf 2) $@ $NORMAL
}

show_warn () {
    echo -e $BOLD$(tput setaf 11) $@ $NORMAL
}

show_err ()  {
    echo -e $BOLD$(tput setaf 9) $@ $NORMAL
}

print_title() {
    print_raw $NL
    show_info "---- ${1:Title} ----"
}

confirm() {
  while true; do
  read -r -n 1 -p "${1:-Continue?} [y/n]: " REPLY
      case $REPLY in
          [yY]) echo; return 0 ;;
          [nN]) echo; return 1 ;;
          *) show_err "Invalid nput"
      esac
  done
}

print_required_env(){
    show_warn "Required environment variables"
    for i in "${ENV_VARS[@]}"
    do
        show_warn "\t${i}"
    done
}

# check all env vars are in .env file
validate_env_file() {
    for i in "${ENV_VARS[@]}"
    do
        ENV_VAL=$(grep -w $i .env | cut -d '=' -f2)
        if [[ -z "${ENV_VAL}" ]]; then
            show_err "${i} not set in ${CURRENT_DIRECTORY}/.env"
            print_required_env
            exit 1
        fi
    done
    show_info "All environment variables in ${CURRENT_DIRECTORY}/.env are present."
}

# detect .env file
check_env_file() {
    if [ -f "${CURRENT_DIRECTORY}/.env" ]; then
        confirm "${CURRENT_DIRECTORY}/.env file found! Do you want to process this file?" && return 0 || return 1
    fi
}

# accept a question(string) and assign it to a variable
ask() {
    if [[ -z "${!2}" ]]; then
        read -p "${NL}${BOLD}$1${NORMAL}" $2
    fi
}

# Database questions
questions_db() {
    print_title "Database"
    if $(confirm "Are you using an EXTERNAL postgresql database(RDS or any hosted database)?" && return 0 || return 1); then
        ask "Enter database host: " PAM_DATABASE_URL
        ask "Enter database port: " PAM_DATABASE_PORT
        ask "Enter database name: " PAM_DATABASE
        ask "Enter database user: " PAM_DATABASE_USER
        ask "Enter database password: " PAM_DATABASE_PASSWORD
    else
        print_raw $NL
        show_err "We only support EXTERNAL DB for now."
        exit 1
    fi
}

questions_vault() {
    print_title "Vault"
    ask "Enter vault domain: " VAULT_DOMAIN
    ask "Enter vault token: " VAULT_API_TOKEN
}

questions_email() {
    print_title "Email"
    ask "Enter email service(gmail for now): " PAM_MAIL_SERVICE
    ask "Enter email username: " PAM_MAIL_USER
    ask "Enter email password: " PAM_MAIL_PASS
}

build() {
    print_raw $NL
    show_info "Building docker image..."
    docker build -t $APP_NAME .
}

run(){
    docker run -itd \
        -v ${PWD}:/usr/src/app \
        -v /usr/src/app/node_modules \
        -p 3000:3000 \
        --rm \
        $APP_NAME
}

build_run() {
    echo $PARAMS
    "${PARAMS}"docker-compose up -d --build
}

run_params() {
    for ENV_KEY in "${ENV_VARS[@]}"
    do
        ENV_VAL="${!ENV_KEY}"
        PARAMS="${PARAMS}${ENV_KEY}=${ENV_VAL} "
    done
    show_info "Running docker with these parameters: ${PARAMS}"

    build_run $PARAMS
    #docker run -itd \
    #    -v ${PWD}:/usr/src/app \
    #    -v /usr/src/app/node_modules \
    #    -p 3000:3000 \
    #    $PARAMS \
    #    --name $APP_NAME \
    #    --rm \
    #    $APP_NAME
    }

finish() {
    show_info "Listing all running docker images."
    docker-compose ps
    show_info "Sweet! The application will be up soon."
    print_raw $NL
}

main() {
    show_info "--------------------------------------------------"
    show_info "---- Welcome to Vault PAM installation script ----"
    show_info "--------------------------------------------------"
    print_raw $NL
    if check_env_file
    then
        validate_env_file
        build_run
        finish
    else
        questions_db
        questions_vault
        questions_email
        run_params
        finish
    fi
}

if [[ "$0" == "${BASH_SOURCE[0]}" ]]; then
    main "$@"
fi