#!/usr/bin/env bash
#

readonly APP_NAME=vault-pam-ui
readonly CURRENT_SCRIPT="$(basename -- ${BASH_SOURCE[0]})"
readonly CURRENT_DIRECTORY="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly DOCKER_BINARY="$(command -v docker)"
readonly ENV_VARS=(PAM_DATABASE
                  PAM_DATABASE_USER
                  PAM_DATABASE_PASSWORD
                  PAM_DATABASE_URL
                  PAM_DATABASE_PORT
                  VAULT_API_TOKEN
                  PAM_MAIL_SERVICE
                  PAM_MAIL_USER
                  PAM_MAIL_PASS)
# styles
NL=$'\n'
BOLD=$(tput bold)
SGR0=$(tput sgr0)

# usage: print [args...]
print() {
    printf "${CURRENT_SCRIPT}: $*$NL"
}

# usage: print_raw [args...]
print_raw() {
    printf "$*$NL"
}

# usage: error [args...]
error() {
    print "error: $*" >&2
}

# usage: error_raw [args...]
error_raw() {
    print "$*" >&2
}

confirm() {
  while true; do
    read -r -n 1 -p "${1:-Continue?} [y/n]: " REPLY
    case $REPLY in
      [yY]) echo ; return 0 ;;
      [nN]) echo ; return 1 ;;
      *) printf " \033[31m %s \n\033[0m" "invalid input"
    esac
  done
}

print_required_env(){
    print_raw "Required environment variables"
    for i in "${ENV_VARS[@]}"
    do
        print_raw "\t${i}"
    done
}

# check all env vars are in .env file
validate_env_file() {
    for i in "${ENV_VARS[@]}"
    do
        ENV_VAL=$(grep -w $i .env | cut -d '=' -f2)
        if [[ -z "${ENV_VAL}" ]]; then
            error "${i} not set in ${CURRENT_DIRECTORY}/.env"
            print_required_env
            exit 1
        fi
    done
    print_raw "All environment variables in ${CURRENT_DIRECTORY}/.env are present."
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
        read -p "${NL}${BOLD}$1${SGR0}" $2
    fi
}

# Database questions
questions_db() {
    print_raw "**** DB ****"
    if $(confirm "Are you using EXTERNAL postgresql database(RDS or any hosted database)?" && return 0 || return 1); then
        ask "Enter database host: " PAM_DATABASE_URL
        ask "Enter database port: " PAM_DATABASE_PORT
        ask "Enter database name: " PAM_DATABASE
        ask "Enter database user: " PAM_DATABASE_USER
        ask "Enter database password: " PAM_DATABASE_PASSWORD
    else
        print_raw $NR
        error "We only support EXTERNAL DB for now."
        exit 1
    fi
}

questions_vault() {
    print_raw "**** Vault ****"
    ask "Enter vault token: " VAULT_API_TOKEN
}

questions_email() {
    print_raw "**** Email ****"
    ask "Enter email service(gmail for now): " PAM_MAIL_SERVICE
    ask "Enter email username: " PAM_MAIL_USER
    ask "Enter email password: " PAM_MAIL_PASS
}

build() {
    print_raw "Building docker image..."
    docker build -t $APP_NAME .
    #docker ps -a
    #print_raw "Sweet! The application will be up soon."
}

run(){
    docker run -itd \
        -v ${PWD}:/usr/src/app \
        -v /usr/src/app/node_modules \
        -p 3000:3000 \
        --rm \
        $APP_NAME
}

run_params() {
    for ENV_KEY in "${ENV_VARS[@]}"
    do
        ENV_VAL="${!ENV_KEY}"

        PARAMS="$PARAMS-e $ENV_KEY=$ENV_VAL "
    done
    docker run -itd \
        -v ${PWD}:/usr/src/app \
        -v /usr/src/app/node_modules \
        -p 3000:3000 \
        $PARAMS \
        --rm \
        $APP_NAME
    }

done() {
    docker ps -a
    print_raw "Sweet! The application will be up soon."
}

main() {
    print_raw "**************************************************"
    print_raw "**** Welcome to Vault PAM installation script ****"
    print_raw "**************************************************"
    print_raw $NR
    if check_env_file
    then
        validate_env_file
        build
        run
        done
    else
        questions_db
        questions_vault
        questions_email
        build
        run_params
        done
    fi
}

if [[ "$0" == "${BASH_SOURCE[0]}" ]]; then
    main "$@"
fi