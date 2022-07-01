pragma solidity =0.5.16;



contract ERC20 {
    // using SafeMath for uint;

    event Transfer(address indexed _from, address indexed _to, uint indexed _amount);
    event Approval(address indexed _owner, address indexed _spender, uint indexed _amount);

    string public name;
    string public symbol;
    uint public decimals = 18;
    uint public totalSupply;
    mapping(address => uint) balances;
    mapping(address => mapping(address => uint)) public allowance;

    constructor(string memory _name, string memory _symbol, uint _totalSupply) public {
        name = _name;
        symbol = _symbol;
        totalSupply = _totalSupply;
        balances[msg.sender] = totalSupply;
    }

    function balanceOf(address _address) public view returns(uint) {
        return balances[_address];
    }

    function _transfer(address _from, address _to, uint _amount) private {
        balances[_from] -= _amount;
        balances[_to] += _amount;
        emit Transfer(_from, _to, _amount);
    }

    function approve(address _spender, uint _amount) public {
        require(balances[msg.sender] >= _amount);
        _approve(msg.sender, _spender, _amount);
    }

    function _approve(address _owner, address _spender, uint _amount) private{
        allowance[_owner][_spender] = _amount;
        emit Approval(_owner, _spender, _amount);
    }

    function transfer(address _to, uint _amount) public {
        require(balances[msg.sender] >= _amount);
        _transfer(msg.sender, _to, _amount);
    }

    function transferFrom(address _from, address _to, uint _amount) public {
        require(allowance[_from][msg.sender] >= _amount);
        _transfer(_from, _to, _amount);
        _approve(_from, msg.sender, allowance[_from][msg.sender] - _amount);
    }

}