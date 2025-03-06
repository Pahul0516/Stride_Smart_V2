from flask import Blueprint, request, jsonify, current_app
from app.services.AccountService import AccountService
from itertools import pairwise
from app.repositories.AccountRepo import AccountRepo

create_account_bp = Blueprint('createAccount', __name__)

@create_account_bp.route('/createAccount',methods=['POST'])
def createAccount():
    print('reached backend logic of the api')
    accountRepo= AccountRepo('localhost','Maps_DB','postgres','Qwertyuiop12')
    accountService=AccountService(accountRepo)
    data = request.json
    userName=data.get('userName')
    email=data.get('email')
    password=data.get('password')
    if accountService.findAccount(email)==None:
        accountService.addAccount(userName,email,password,'normal')
        user=accountService.findAccount(email)
        return jsonify(user)
    else:
        return jsonify('Error: You already have an account with this email'),400